import { SSEParser } from "./SSEParser";
import type { ISSEHeartbeatOptions, ISSEMessage, ISSEOptions, ISSEReconnectOptions, TSSEState } from "./types";

/**
 * 开一轮连接：按 signal 建连，成功交出 reader，失败抛错。
 * 由 `SSE` 提供，首次连接与每次重连都会重新调一次 —— 每轮都是一次全新的请求。
 */
type TSSEOpen = (signal: AbortSignal) => Promise<ReadableStreamDefaultReader<Uint8Array>>;

/**
 * 重连的默认策略，调用方只覆盖自己关心的字段。
 * `maxRetries` 默认不限：长连接中途断了就一直接回来，本来就是常态；
 * 真想「重连几次就算了」的业务自己配上限（比如 `maxRetries: 5`）。
 */
const DEFAULT_RECONNECT: Required<ISSEReconnectOptions> = {
  maxRetries: Infinity,
  interval: 1,
  factor: 2,
  maxInterval: 30
};

/**
 * 心跳的默认阈值（秒）。注意它不是「默认心跳」：
 * 不传 `heartbeat` 是关闭（`0`），它只在心跳被开启（传 `true`、`{}`，或 `heartbeat()` 不带参）时用到。
 */
const DEFAULT_HEARTBEAT = 30;

/**
 * 一轮连接活多久才算「这次真的连上了」（毫秒）。
 *
 * 撑够它才把重连次数清零：否则「连得上但马上断」（服务端 502、网关立刻掐）会让每次重连都被当成
 * 一次成功、计数与退避不停清零，变成没完没了的快速重连风暴。
 */
const HEALTHY_ALIVE_MS = 3000;

/**
 * 一条 SSE 连接。
 *
 * 两种消费方式，可以同时用：
 * ```ts
 * const connection = await api.sse("task/stream");
 * for await (const message of connection) { ... }   // 异步迭代
 * connection.onMessage(m => { ... });               // 或者注册回调
 * connection.close();
 * ```
 *
 * 这里的「一条连接」会跨越底层多次重建：断线（网络异常 / 非 2xx / 心跳超时）自动重连，
 * 重连期间消息队列、回调和迭代器都不中断 —— 对业务来说它就是「一直有效的那条连接」。
 * 四种不重连的结束方式：服务端正常结束（后端 `close()` 关掉会话）、业务主动 `close()`、
 * 重连次数用尽、以及首次就没连上（那时 `connect()` / `ready()` 直接 reject）。
 *
 * 重连是「重新发一次请求」，不是断点续传：后端 `ServerSentEvent` 的 id 每帧一个 uniqid、
 * 也没有 `Last-Event-ID` 续推，断开那段时间的消息就是没有的，需要业务自己兜
 * （消息里带进度、消费侧做幂等）。
 *
 * 消费侧两点注意：
 * - 消息到达时既进队列也过回调，所以 `for await` 晚一点开始也丢不了；
 *   但 `onMessage` 只管注册之后的消息，注册晚了补不到前面已经收到的。
 * - 队列是共享的（见 `#queue`）：正常用法是一个消费者，同时开多个 `for await` 会互相抢消息。
 *
 * 为什么「跨连接」的会话逻辑在这一层：自动重连意味着一个对象要管多条底层连接，
 * 而 `SSE` 提供的是「怎么发一次请求」，通过构造时传进来的 `open` 闭包按需调用。
 */
export class SSEConnection implements AsyncIterable<ISSEMessage> {
  /** 由 `SSE` 给的建连闭包，每一轮（首次 + 每次重连）调一次 */
  #open: TSSEOpen;
  /** 开不开自动重连。它与 `#reconnect` 在构造时由 `ISSEOptions` 归一化，之后不再变 */
  #reconnectEnabled: boolean;
  #reconnect: Required<ISSEReconnectOptions>;
  /** 心跳阈值（秒），`0` 是关。它是这里唯一能在运行时改的配置项，入口是 `heartbeat()` */
  #heartbeatTimeout: number;

  /**
   * 对外状态，见 `TSSEState`。
   * 注意初始就是 `open`：首次连接还没结果时也报 `open`（会话在跑、还没结束），
   * 想知道「连上过没有」看 `ready()`，想知道「此刻在不在重连」看它。
   */
  #state: TSSEState = "open";
  /** 连上过没有（连上之后不因断开复位）：用来区分「首次没连上」与「连上之后断了」 */
  #connected = false;
  /** 业务主动 `close()` 过 —— 它引起的中断不算错误，也不重连 */
  #closedByUser = false;
  /** 结束时的错误（正常结束就是 `null`），迭代器结束时把它抛出去 */
  #error: Error | null = null;
  /** 已重连次数。只有当一轮连接撑过 `HEALTHY_ALIVE_MS` 才清零，否则继续累计 */
  #retries = 0;

  /** 收到了但还没被消费的消息：回调与迭代器共用它，所以同时只该有一个消费者 */
  #queue: ISSEMessage[] = [];
  /** 迭代器在等消息时的唤醒函数，同一时刻只记一个（多个 `for await` 会互相覆盖，见 `#notify`） */
  #wake: (() => void) | null = null;
  /** 当前这一轮的 AbortController：`close()` 与心跳超时都通过它掐断 */
  #controller: AbortController | null = null;
  /** 当前这一轮的 reader，这一轮结束（无论正常还是出错）都要 cancel 掉 */
  #reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  /** 当前这一轮是什么时候开始的，用来判断它算不算「真的连上了」 */
  #aliveAt = Date.now();
  /** 最后一次「确认连接还活着」的时刻：开始一轮连接、以及每收到一块数据都刷新，心跳靠它判超时 */
  #lastActiveAt = Date.now();
  /** 心跳计时器，跟着当前这一轮走（`#consumeOnce` 起、轮次结束就停） */
  #heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  /** 重连等待中的计时器，`close()` 要能把它立刻打断 */
  #wakeFromSleep: (() => void) | null = null;

  #messageHandlers: Array<(message: ISSEMessage) => void> = [];
  #errorHandlers: Array<(error: Error) => void> = [];
  #closeHandlers: Array<() => void> = [];
  #reconnectHandlers: Array<(attempt: number) => void> = [];
  /** `ready()` 的等待者：只在「首次连接还没结果」时有人等，兑现一次后就清空 */
  #readyWaiters: Array<{ resolve: (connection: SSEConnection) => void; reject: (error: Error) => void }> = [];

  /**
   * 构造即开始连接（不用等 `ready()`），连接过程在内部一轮一轮地跑。
   *
   * 选项只在这里归一化一次：重连策略之后固定不变，心跳阈值还能用 `heartbeat()` 改。
   */
  constructor(open: TSSEOpen, options: ISSEOptions = {}) {
    this.#open = open;
    this.#reconnectEnabled = options.reconnect !== false;
    this.#reconnect = {
      ...DEFAULT_RECONNECT,
      ...(typeof options.reconnect === "object" ? options.reconnect : null)
    };
    this.#heartbeatTimeout = this.#resolveHeartbeatTimeout(options.heartbeat);

    void this.#run();
  }

  /* ---------------------------------- 消费 ---------------------------------- */

  /** 注册消息回调，返回 this 可链式注册。只收注册之后的消息，之前的补不到 */
  onMessage(handler: (message: ISSEMessage) => void): this {
    this.#messageHandlers.push(handler);
    return this;
  }
  /** 注册错误回调：重连次数用尽时给最后一次的错误（服务端正常结束与主动 `close()` 都不算错误） */
  onError(handler: (error: Error) => void): this {
    this.#errorHandlers.push(handler);
    return this;
  }
  /** 注册关闭回调：不管正常结束还是出错，结束都会走一次 */
  onClose(handler: () => void): this {
    this.#closeHandlers.push(handler);
    return this;
  }
  /**
   * 注册重连回调：每次开始重连时给一次「第几次重连」。
   * 纯观测用（界面上提示「连接中断，重连中」），重连本身不依赖它；
   * 重连成功不会再回调一次，想知道现在连着没有看 `state()`。
   */
  onReconnect(handler: (attempt: number) => void): this {
    this.#reconnectHandlers.push(handler);
    return this;
  }
  /**
   * 当前状态。注意初始就是 `open` —— 首次连接还没结果时也是它，
   * 因为那时会话确实在跑、只是还没连上，判断「连上过没有」要用 `ready()`。
   */
  state(): TSSEState {
    return this.#state;
  }

  /**
   * 等「连上」：首次连接成功 resolve 这条连接，连不上 reject。
   * `SSE.connect()` 返回的就是它，所以 `await kitRequest.sse(...)` 拿到的连接一定已经连上。
   *
   * 它只兑现首次连接：之后再断开 / 重连不影响这个 Promise（连过就是连过），
   * 想知道「此刻连着没有」看 `state()`。
   */
  ready(): Promise<SSEConnection> {
    if (this.#connected) {
      return Promise.resolve(this);
    }
    if (this.#state === "closed") {
      return Promise.reject(this.#error ?? new Error("SSE 连接已关闭"));
    }

    return new Promise<SSEConnection>((resolve, reject) => {
      this.#readyWaiters.push({ resolve, reject });
    });
  }

  /**
   * 开启 / 调整心跳检测，传 `false` 关掉，返回 this 可链式调用。
   *
   * 建连时的 `heartbeat` 选项就是它的初始值，这里是运行时要改的入口
   * （比如页面切到后台时放宽阈值，或者临时关掉）。
   *
   * 只影响之后的计时：新阈值从「现在」开始算，不会拿它去回看已经过去的那段时间；
   * 已经结束（`closed`）的连接再调它也没有意义。
   */
  heartbeat(timeout: number | false = DEFAULT_HEARTBEAT): this {
    this.#heartbeatTimeout = this.#resolveHeartbeatTimeout(timeout);
    this.#startHeartbeat();
    return this;
  }

  /**
   * 主动关闭连接（不重连，也不走 `onError`）。
   *
   * 幂等：已经结束的连接再调一次什么也不做。
   * 会立刻掐断当前这一轮、并打断重连的退避等待，不用干等一个间隔。
   */
  close(): void {
    if (this.#state === "closed") return;
    this.#closedByUser = true;
    this.#controller?.abort();
    this.#wakeFromSleep?.();
    this.#finish(null);
  }

  /**
   * 异步迭代：一条消息一次 `yield`，正常结束就自然返回，出错时抛出。
   *
   * 重连期间不结束 —— `reconnecting` 只是「暂时没有新消息」，重连成功后接着来。
   * 消息来自共享队列（见 `#queue`），所以同时只该有一个 `for await` 在消费。
   */
  async *[Symbol.asyncIterator](): AsyncGenerator<ISSEMessage> {
    while (true) {
      const message = this.#queue.shift();
      if (message) {
        yield message;
        continue;
      }
      // `reconnecting` 不算结束：重连成功后会接着往队列里放消息
      if (this.#state === "closed") {
        if (this.#error) throw this.#error;
        return;
      }
      await new Promise<void>(resolve => { this.#wake = resolve; });
    }
  }

  /* ---------------------------------- 内部 ---------------------------------- */

  /**
   * 会话主循环：构造时启动一次，一轮一轮地开连接，跑到不该再重连为止；跑完即终态（`#finish`）。
   * 每轮都拿到「这轮是怎么结束的」——`null` 是服务端正常结束，`Error` 是异常断开。
   */
  async #run(): Promise<void> {
    while (!this.#closedByUser) {
      const error = await this.#consumeOnce();

      // 这一轮活够了时长才把重连计数清零（见 HEALTHY_ALIVE_MS）；
      // 刚连上就被掐的那一轮不算「恢复」，计数与退避继续累计
      if (Date.now() - this.#aliveAt >= HEALTHY_ALIVE_MS) {
        this.#retries = 0;
      }

      if (this.#closedByUser) break;
      // 服务端正常结束（流读到结尾，一般就是后端 close() 结束了会话）
      if (!error) break;
      // 从没连上过就不兜底重连：`connect()` / `ready()` 的 Promise 要把「连不上」如实交出去，
      // 否则地址写错、401 这类问题会被无限重试吞掉。要连上为止的话，调用方自己再 `sse()` 一次就好。
      // 判据是「连上过没有」而不是「第几轮」—— 首发连上之后再断的，才算断线
      if (!this.#connected || !this.#reconnectEnabled || this.#retries >= this.#reconnect.maxRetries) {
        this.#finish(error);
        return;
      }

      this.#retries++;
      this.#state = "reconnecting";
      this.#reconnectHandlers.forEach(handler => handler(this.#retries));
      this.#notify();
      await this.#sleep(this.#delay());
    }

    this.#finish(null);
  }

  /**
   * 跑一轮连接：建连 → 收帧，直到流结束（返回 `null`）或出错（返回 `Error`）。
   *
   * 返回 `null` 也可能是被 `close()` 打断的（那时它只是「这轮结束了」，错误不该上报），
   * 主循环靠 `#closedByUser` 分辨。
   *
   * 心跳计时跟着这一轮走，所以「建连请求发出去就挂住」和「连上之后静默」都能被发现 ——
   * 断网时 fetch 的流经常既不报错也不结束，只能靠「多久没收到东西」判断。
   */
  async #consumeOnce(): Promise<Error | null> {
    const controller = this.#controller = new AbortController();
    this.#aliveAt = Date.now();
    this.#startHeartbeat();

    try {
      const reader = this.#reader = await this.#open(controller.signal);
      this.#state = "open";
      this.#connected = true;
      this.#settleReady(null);

      // 每轮都用新解析器：上一轮的 id / event 中间态不跨连接沿用（本来也不支持续传）
      const parser = new SSEParser();
      while (true) {
        const { value, done } = await reader.read();
        // 流读到结尾 = 服务端主动结束了这条流（后端 close() 关掉会话）
        if (done) return null;

        this.#lastActiveAt = Date.now();
        for (const message of parser.push(value)) {
          this.#queue.push(message);
          this.#messageHandlers.forEach(handler => handler(message));
        }
        this.#notify();
      }
    } catch (e) {
      // 主动 close() 与心跳掐断都会走到这里，前者不该当错误上报
      return this.#closedByUser ? null : (e as Error);
    } finally {
      this.#stopHeartbeat();
      this.#controller = null;
      try {
        await this.#reader?.cancel();
      } catch {
        // 流已结束或已出错时 cancel 会 reject，忽略
      }
      this.#reader = null;
      // 这轮不管怎么结束都把底层连接放掉（abort 幂等，正常结束时多这一下也无害）
      controller.abort();
    }
  }

  /**
   * 起心跳计时器。只在「有一轮连接进行中」时起作用 ——
   * 重连的退避等待是正常流程，不该被心跳当成断线。
   *
   * 检查间隔取阈值的一半（下限 200 毫秒、上限 1 秒），所以改阈值后立刻按新节奏来。
   */
  #startHeartbeat(): void {
    this.#stopHeartbeat();
    if (!this.#heartbeatTimeout || !this.#controller) return;

    this.#lastActiveAt = Date.now();
    const period = Math.max(200, Math.min(1000, this.#heartbeatTimeout * 500));
    this.#heartbeatTimer = setInterval(() => {
      if (Date.now() - this.#lastActiveAt < this.#heartbeatTimeout * 1000) return;
      // 超过阈值没收到服务端任何数据：这轮已经死了，掐断它（异常 → 走重连）
      this.#lastActiveAt = Date.now();
      this.#controller?.abort();
    }, period);
  }

  /** 停掉心跳计时器（幂等）：轮次结束、以及每次重起计时前都调它 */
  #stopHeartbeat(): void {
    if (this.#heartbeatTimer === null) return;
    clearInterval(this.#heartbeatTimer);
    this.#heartbeatTimer = null;
  }

  /** 归一化心跳配置：数字就是秒数，`true` 用默认值，对象取 `timeout`，其余（含 `false`）为关闭 */
  #resolveHeartbeatTimeout(value: boolean | number | ISSEHeartbeatOptions = false): number {
    if (typeof value === "number") {
      return value > 0 ? value : 0;
    }
    if (value === true) {
      return DEFAULT_HEARTBEAT;
    }
    if (value && typeof value === "object") {
      const timeout = value.timeout ?? DEFAULT_HEARTBEAT;
      return timeout > 0 ? timeout : 0;
    }
    return 0;
  }

  /**
   * 下一次重连前等多久：每失败一次按 `factor` 退避，上限 `maxInterval`。
   * 它在 `#retries` 自增之后才调用，所以第一次重连等的就是 `interval`。
   */
  #delay(): number {
    const { interval, factor, maxInterval } = this.#reconnect;
    return Math.min(interval * Math.pow(factor, this.#retries - 1), maxInterval);
  }

  /**
   * 重连前的等待；`close()` 会立刻打断它，不用干等一个退避间隔。
   * 同一时刻只会有一次等待（重连是串行的），所以一个唤醒函数就够。
   */
  #sleep(seconds: number): Promise<void> {
    return new Promise<void>(resolve => {
      const timer = setTimeout(() => {
        this.#wakeFromSleep = null;
        resolve();
      }, seconds * 1000);

      this.#wakeFromSleep = () => {
        clearTimeout(timer);
        this.#wakeFromSleep = null;
        resolve();
      };
    });
  }

  /**
   * 唤醒等在迭代器上的消费者（来消息了、或状态变了）。
   * 用一次就清掉：唤醒是一次性的，下一个等的人会重新登记。
   */
  #notify(): void {
    const wake = this.#wake;
    this.#wake = null;
    wake?.();
  }

  /**
   * 兑现 `ready()` 的等待者：正常连上就 resolve，没连上就结束则 reject。
   * 只兑现一次（兑现后清空），之后 `ready()` 走 `#connected` / `#state` 的快速路径。
   */
  #settleReady(error: Error | null): void {
    if (!this.#readyWaiters.length) return;

    const waiters = this.#readyWaiters;
    this.#readyWaiters = [];
    waiters.forEach(waiter => (error ? waiter.reject(error) : waiter.resolve(this)));
  }

  /**
   * 进入终态：置 `closed`、停心跳、兑现 `ready()`、唤醒迭代器，再依次走 `onError`（有错时）与 `onClose`。
   *
   * 幂等（已经结束就直接返回），所以 `close()` 与主循环结束各调一次也只算一次。
   * 先兑现 `ready()` 再唤醒迭代器，是为了让 `await kitRequest.sse(...)` 的调用方先拿到结果。
   */
  #finish(error: Error | null = null): void {
    if (this.#state === "closed") return;
    this.#state = "closed";
    this.#error = error;
    this.#stopHeartbeat();
    this.#settleReady(error ?? new Error("SSE 连接还没连上就已经结束"));
    this.#notify();

    if (error) {
      this.#errorHandlers.forEach(handler => handler(error));
    }
    this.#closeHandlers.forEach(handler => handler());
  }
}
