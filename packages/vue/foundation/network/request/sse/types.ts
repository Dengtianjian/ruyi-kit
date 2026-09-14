/**
 * SSE 消息实体。
 */
export interface ISSEMessage {
  /** 事件名，默认消息为 "message" */
  event: string;
  /** 数据内容（多行 `data:` 已按规范用 `\n` 拼接） */
  data: string;
  /** 事件 ID */
  id: string;
}

/**
 * SSE 连接状态。
 * - `open`         已连上，正在收消息
 * - `reconnecting` 断了、正在重连（消息队列、回调、迭代器都不中断，对业务透明）
 * - `closed`       已结束（业务主动 close、服务端正常结束、或重连次数用尽）
 */
export type TSSEState = "open" | "reconnecting" | "closed";

/**
 * 心跳配置：多久没收到服务端数据就判定连接已死。
 */
export interface ISSEHeartbeatOptions {
  /**
   * 超过多少秒没收到服务端任何数据就当作断线（默认 30）。
   * 要大于服务端推 `ping` 的间隔 + 网络抖动 —— 配小了会把好连接也掐断、白重连一轮。
   */
  timeout?: number;
}

/**
 * 自动重连配置。
 */
export interface ISSEReconnectOptions {
  /** 最多重连几次，默认不限（一直重连到成功，或业务自己 close） */
  maxRetries?: number;
  /** 第一次重连前等多久（秒），默认 1 */
  interval?: number;
  /** 每失败一次把等待时间乘多少（退避），默认 2 */
  factor?: number;
  /** 单次等待的上限（秒），默认 30 */
  maxInterval?: number;
}

/**
 * 建连选项：`kitRequest.sse(uri, method, options)` 里「这一次连接」的行为，不落到实例上。
 *
 * 自动重连默认开、心跳默认关，原因是两者「猜错的代价」不同：
 * - 长连接断了自己接回来是常态，不想要重连的场景少（传 `false` 关掉就行）；
 * - 心跳阈值取决于服务端多久推一次 `ping`，只有调用方知道，猜小了会把好连接当死链接掉，
 *   所以必须显式配（`heartbeat: 30` 之类）。
 */
export interface ISSEOptions {
  /** 断线自动重连，默认开；传 `false` 关掉 */
  reconnect?: boolean | ISSEReconnectOptions;
  /** 心跳检测，默认关；`true` 用默认阈值，数字表示「多少秒没收到服务端数据算断线」 */
  heartbeat?: boolean | number | ISSEHeartbeatOptions;
}
