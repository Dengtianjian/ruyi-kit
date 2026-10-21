import FetchResponse, { type TFetchResponseHeader } from "./FetchResponse";

export type TMethods = 'OPTIONS' | 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'TRACE' | 'CONNECT' | 'PATCH';

export type TBody = Record<string, any> | BodyInit;

/**
 * 底层发送方式：
 * - `fetch` 默认，基于 fetch API
 * - `xhr`   基于 XMLHttpRequest（需要上传进度、老环境兼容时用）
 *
 * 这里没有 `sse`：SSE 是「长连接 + 多条消息」，和「一次请求一次响应」的模型对不上，
 * 硬塞进来只会让 `FetchResponse` 出现「恒为 200 的状态码 + 恒为空的响应头」。
 * 所以 SSE 单独成类，见 `./sse/SSE.ts`。
 */
export type TTransport = 'fetch' | 'xhr';

/**
 * 中间件：拿到本次请求的 Fetch 实例与**自己的** next，可以改请求头，也可以改响应。
 *
 * `next()` 是「往下走一层」（最内层是真正的发送），每个中间件的这个 next 各自只能调用一次；
 * 响应当作 `next()` 的返回值回来，所以 `await next()` 之后的代码就是「内层跑完、响应回来了」。
 */
export type TFetchMiddleware<T = any> = (fetch: Fetch, next: () => Promise<FetchResponse<T>>) => Promise<FetchResponse<T>>;

/**
 * fetch 约束参数，在 RequestInit 之上补了 xhr 用的 `withCredentials`
 */
export type TFetchOptions = RequestInit & { withCredentials?: boolean };

export interface IFetchConfig {
  /** 请求根地址 */
  baseUrl?: string;
  /** 业务前缀，会拼在 uri 之前 */
  prefix?: string | number | (number | string)[];
  /** 请求方法 */
  method?: TMethods;
  /** 查询参数 */
  query?: Record<string, number | string | boolean>;
  /** 请求体 */
  body?: TBody;
  /** 长期请求头，不会被 reset 清掉 */
  headers?: Record<string, string>;
  /** fetch 约束参数 */
  options?: TFetchOptions;
  /** 中间件（长期，随实例走） */
  middlewares?: Array<TFetchMiddleware>;
  /** 底层发送方式 */
  transport?: TTransport;
}

/**
 * 请求层最底层：只负责“把一次请求发出去”，并把结果包成 FetchResponse。
 *
 * 不判定成功 / 失败：拿到什么响应就交出什么响应（非 2xx 一样 resolve），成功与否只记录在
 * `FetchResponse.success()` 上；要改这个结论，由中间件返回一个成功的 `FetchResponse`。
 * 本层只对「压根没拿到响应」（网络异常 / 超时 / 中止）reject。
 *
 * 它是一次性的（per-request）——每次 `send()` 结束后会 `reset()`，
 * 所以不要在它身上累积跨请求的参数；长期复用的写法见 `Request`。
 *
 * 对外只开放两件事：配置方法（`url` / `method` / `body` / `header` / `use` …，无参即读取）与 `send()`。
 * URL 生成、中间件执行、底层发送都是 `protected`，留给 `Request` / `SSE` 这类子类复用 ——
 * 业务侧不该绕过 `send()` 自己把请求发出去（那会跳过全部中间件）。
 */
export class Fetch {
  #baseUrl: string = null;
  #prefix: string | number | (number | string)[] = null;
  #method: TMethods = "GET";
  #uri: string | number | (string | number)[] = null;
  #query: Record<string, string> = {};
  #body: TBody = null;
  #headers: Record<string, string> = {};
  #globalHeaders: Record<string, string> = {};
  #options: TFetchOptions = {};
  #transport: TTransport = "fetch";
  #middlewares: Array<TFetchMiddleware> = [];
  #scopedMiddlewares: Array<TFetchMiddleware> = [];

  constructor(config: IFetchConfig = {}) {
    this.#baseUrl = config.baseUrl ?? null;
    this.#prefix = config.prefix ?? null;
    this.#method = config.method ?? "GET";
    this.#body = config.body ?? null;
    this.#options = config.options ?? {};
    this.#transport = config.transport ?? "fetch";
    this.#globalHeaders = config.headers ? { ...config.headers } : {};
    this.#middlewares = config.middlewares ? [...config.middlewares] : [];

    const query = config.query ?? {};
    for (const key in query) {
      this.#query[key] = this.#stringify(query[key]);
    }
  }

  /* ---------------------------------- 配置 ---------------------------------- */

  /*
   * 链式配置方法统一约定：**不传参 = 读取，传参 = 设置**。
   * 读取返回当前值，设置写入并返回 `this`，于是一路 `request.url("/api").method("POST")` 可以接着写下去。
   *
   * 两种行为用分开的重载声明，调用侧拿到的返回类型是精确的（不会退化成 `this | 值` 的联合）；
   * 实现签名则写成「首个参数可选 + 返回联合类型」——零参的重载要能兼容实现签名，
   * 首个参数一旦必填就会触发 TS2394（重载签名与其实现签名不兼容）。
   *
   * 读取统一走这组方法（不再有独立的 `requestXxx` getter），返回的都是**原始字段**：
   * 「长期 + 本次」合并后的视图只在发送时临时拼（见 `resolveFetchParams` / `toConfig`），
   * 所以 `headers()` 只给本次请求头，长期的那份在 `globalHeaders()`。
   */

  /** 请求根地址（长期配置，`reset()` 不清） */
  url(): string;
  url(baseUrl: string): this;
  url(baseUrl?: string): this | string {
    if (!arguments.length) return this.#baseUrl;

    this.#baseUrl = baseUrl;
    return this;
  }
  /** URI 路径段，数组按顺序拼接；属于本次请求，`reset()` 后清空 */
  uri(): string | number | (string | number)[];
  uri(value: string | number | (string | number)[]): this;
  uri(value?: string | number | (string | number)[]): this | string | number | (string | number)[] {
    if (!arguments.length) return this.#uri;

    this.#uri = value;
    return this;
  }
  /** 业务前缀，拼在 URI 之前（长期配置，`reset()` 不清） */
  prefix(): string | number | (string | number)[];
  prefix(value: string | number | (string | number)[]): this;
  prefix(value?: string | number | (string | number)[]): this | string | number | (string | number)[] {
    if (!arguments.length) return this.#prefix;

    this.#prefix = value;
    return this;
  }
  /** 请求方法，默认 GET（长期配置；单次请求的方法由 `send(uri, method)` 指定，不受它影响） */
  method(): TMethods;
  method(value: TMethods): this;
  method(value?: TMethods): this | TMethods {
    if (!arguments.length) return this.#method;

    this.#method = value;
    return this;
  }
  /**
   * 单个查询参数（本次请求，`reset()` 清空）。
   * `value` 为 null / undefined 时默认**跳过不写入**——业务里 `query("a", maybeUndefined)` 是常见写法，
   * 传 `allowNull = true` 才会把空值也拼进 URL。
   */
  query(key: string, value: number | string | boolean, allowNull: boolean = false): this {
    if ((value === null || value === undefined) && allowNull === false) {
      return this;
    }
    this.#query[key] = this.#stringify(value);
    return this;
  }
  /** 批量设置查询参数（本次请求）；不传参读取全部，值已字符串化，可直接改这个对象 */
  queries(): Record<string, string>;
  queries(query: Record<string, number | string | boolean>): this;
  queries(query?: Record<string, number | string | boolean>): this | Record<string, string> {
    if (!arguments.length) return this.#query;

    if (query === null) query = {};
    for (const key in query) {
      this.query(key, query[key]);
    }
    return this;
  }
  /**
   * 请求体（本次请求，`reset()` 后清空）。
   * 传普通对象会在发送时自动 JSON 化（见 `resolveFetchParams`）；只有非 GET 请求才会带上它。
   */
  body(): TBody;
  body(data: TBody): this;
  body(data?: TBody): this | TBody {
    if (!arguments.length) return this.#body;

    this.#body = data;
    return this;
  }
  /** 设置单个请求头（本次请求，发送后会被 reset 清掉；要常驻请用 `globalHeaders()`） */
  header(key: string, value: string = ""): this {
    this.#headers[key] = value;
    return this;
  }
  /**
   * 批量设置请求头（本次请求，`reset()` 清掉，与已设的单项请求头合并而非覆盖）。
   * 不传参读取的是**本次**请求头，不含长期请求头——发送时才会与长期请求头合并（长期优先，见 `globalHeaders`）。
   */
  headers(): Record<string, string>;
  headers(headers: Record<string, string>): this;
  headers(headers?: Record<string, string>): this | Record<string, string> {
    if (!arguments.length) return this.#headers;

    if (headers === null) headers = {};
    Object.assign(this.#headers, headers);
    return this;
  }
  /**
   * 批量设置长期请求头（随实例走，`reset()` 不清，与已有长期请求头合并而非覆盖）。
   *
   * 与 `headers()` 的区别只在生命周期：这里设的会一直带着（鉴权、租户标识这类），
   * 发送时排在本次请求头之后合并，所以同名时长期优先。
   */
  globalHeaders(): Record<string, string>;
  globalHeaders(headers: Record<string, string>): this;
  globalHeaders(headers?: Record<string, string>): this | Record<string, string> {
    if (!arguments.length) return this.#globalHeaders;

    if (headers === null) headers = {};
    Object.assign(this.#globalHeaders, headers);
    return this;
  }
  /**
   * fetch 约束参数（本次请求，`reset()` 清掉）：整对象传入是合并，也可按单个键设置。
   * 注意 `method` 与请求头最终以本层算出的为准，`options` 里的同名字段覆盖不了它们（见 `resolveFetchParams`）。
   */
  options(key: keyof RequestInit, value: any): this;
  options(): TFetchOptions;
  options(options: TFetchOptions): this;
  options(keyOrOptions?: any, value?: any): this | TFetchOptions {
    if (!arguments.length) return this.#options;

    if (typeof keyOrOptions === "object" && keyOrOptions !== null) {
      Object.assign(this.#options, keyOrOptions);
    } else {
      (this.#options as Record<string, any>)[keyOrOptions] = value;
    }
    return this;
  }
  /** 底层发送方式，默认 `fetch`（长期配置，`reset()` 不清） */
  transport(): TTransport;
  transport(value: TTransport): this;
  transport(value?: TTransport): this | TTransport {
    if (!arguments.length) return this.#transport;

    this.#transport = value;
    return this;
  }
  /** 追加本次请求的中间件（发送后会被 reset 清掉） */
  use(middleware: TFetchMiddleware): this {
    this.#scopedMiddlewares.push(middleware);
    return this;
  }
  /** 本次请求的中间件（发送后会被 reset 清掉）：不传参读取，传参按顺序追加 */
  middlewares(): Array<TFetchMiddleware>;
  middlewares(...middlewares: Array<TFetchMiddleware>): this;
  middlewares(...middlewares: Array<TFetchMiddleware>): this | Array<TFetchMiddleware> {
    if (!arguments.length) return this.#scopedMiddlewares;

    this.#scopedMiddlewares.push(...middlewares);
    return this;
  }
  /** 长期中间件（随实例走，`reset()` 不清）：不传参读取，传参按顺序追加 */
  globalMiddlewares(): Array<TFetchMiddleware>;
  globalMiddlewares(...middlewares: Array<TFetchMiddleware>): this;
  globalMiddlewares(...middlewares: Array<TFetchMiddleware>): this | Array<TFetchMiddleware> {
    if (!arguments.length) return this.#middlewares;

    this.#middlewares.push(...middlewares);
    return this;
  }
  /**
   * 清空“本次请求”的状态，长期配置（baseUrl / prefix / 长期请求头 / 中间件 / transport）保留。
   */
  reset(): this {
    this.#uri = null;
    this.#query = {};
    this.#body = null;
    this.#headers = {};
    this.#options = {};
    this.#scopedMiddlewares = [];
    return this;
  }

  /**
   * 把当前配置导出成 `IFetchConfig`。
   * `Request` / `SSE` 都靠它派生新实例，从而保证「一次请求一个实例」。
   *
   * 取的都是**原始字段**（读取方法），只有请求头是合并后的：本次 + 长期（长期优先），
   * 与发送时 `resolveFetchParams` 的算法一致 —— 派生的新实例只持有长期配置，所以必须在这一步合并。
   */
  protected toConfig(method: TMethods = null): IFetchConfig {
    return {
      baseUrl: this.url(),
      prefix: this.prefix(),
      method: method ?? this.method(),
      query: { ...this.queries() },
      body: this.body(),
      headers: { ...this.headers(), ...this.globalHeaders() },
      options: { ...this.options() },
      middlewares: this.resolveMiddlewares(),
      transport: this.transport()
    };
  }

  /* ---------------------------------- 内部 ---------------------------------- */

  #stringify(value: number | string | boolean): string {
    return (typeof value === "boolean" ? Number(value) : value).toString();
  }
  #isPlainObject(value: any): boolean {
    return typeof value === "object" && value !== null && Object.prototype.toString.call(value) === "[object Object]";
  }
  #parseBody<T>(text: string, headers: TFetchResponseHeader): T {
    if (!text) return null as unknown as T;
    const contentType = headers['content-type'] ?? headers['Content-Type'] ?? "";
    if (contentType.includes("application/json")) {
      try {
        return JSON.parse(text) as T;
      } catch {
        return text as unknown as T;
      }
    }
    return text as unknown as T;
  }
  /** 响应头解析：键统一小写（`SSE` 也用同一套） */
  protected parseResponseHeaders(headers: Headers): TFetchResponseHeader {
    const result: TFetchResponseHeader = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  #parseXHRHeaders(raw: string): TFetchResponseHeader {
    const result: TFetchResponseHeader = {};
    (raw || "").trim().split(/[\r\n]+/).forEach(line => {
      const index = line.indexOf(":");
      if (index > 0) {
        result[line.slice(0, index).trim().toLowerCase()] = line.slice(index + 1).trim();
      }
    });
    return result;
  }

  /* ---------------------------------- 发送 ---------------------------------- */

  /**
   * 本次请求要跑的中间件链路（长期 + 本次），顺序就是链路顺序：外 → 内。
   * 只有这里把两层拼起来，`send()` 与 `SSE` 共用，改链路顺序改这一处即可。
   */
  protected resolveMiddlewares(): Array<TFetchMiddleware> {
    return [...this.globalMiddlewares(), ...this.middlewares()];
  }

  /**
   * 生成请求 URL
   * @param baseUrl 基 URL
   * @param uri URI
   * @param query 查询参数
   */
  protected generateRequestUrl(
    baseUrl: string,
    uri: string | number | (string | number)[],
    query: Record<string, string | number> = {}
  ): string {
    const base = baseUrl ?? "";
    let target = base;
    const params = query ?? {};
    const queryGroup: string[] = [];

    if (base.includes("?")) {
      const uris = base.split("?");
      uris[1].split("&").map(item => item.split("=")).forEach(item => {
        if (!params[item[0]]) {
          params[item[0]] = item[1];
        }
      });
      target = base.substring(0, base.lastIndexOf("?"));
    }

    for (const key in params) {
      queryGroup.push(`${key}=${params[key]}`);
    }

    if (target[target.length - 1] === "/") {
      target = target.substring(0, target.length - 1);
    }

    const uris = (Array.isArray(uri) ? uri : [uri])
      .filter(item => item !== null && item !== undefined)
      .map(item => {
        let value = item.toString();
        if (value[0] === "/") value = value.substring(1);
        if (value[value.length - 1] === "/") value = value.substring(0, value.length - 1);
        return value;
      })
      .filter(item => item.trim());

    const queryString = queryGroup.join("&");
    return [target, ...uris].join("/") + (queryString ? `?${queryString}` : "");
  }

  /**
   * 执行中间件洋葱模型（仅供本层与子类使用）。
   *
   * `middlewares` 按「外 → 内」排列：`[0]` 是最外层、最先执行，`callback`（真正的发送）在最内层，
   * 响应再按相反顺序回到各层 —— 所以中间件里 `await next()` 之后的代码，就是「内层跑完、响应回来了」。
   *
   * 两个约束会在运行时报明确错误，而不是静默跑偏：
   * - 同一个中间件的 `next()` 只能调用一次：它是「往下走一层」，重复调用会重新走一遍发送流程，
   *   悄悄多发一个请求（每个中间件的 next 都是各自的，各调各的、一路往下是正常的）；
   * - 中间件必须 `return next()`：忘了 return 会拿到 `undefined`，报错信息完全指不到问题所在。
   */
  protected executeMiddleware<T>(
    middlewares: Array<TFetchMiddleware<T>>,
    callback: () => Promise<FetchResponse<T>>
  ): Promise<FetchResponse<T>> {
    return this.#executeMiddleware(middlewares, callback, 0);
  }

  /** 洋葱模型的递归本体：按下标往里推进，下标越界就是最内层的真正发送 */
  #executeMiddleware<T>(
    middlewares: Array<TFetchMiddleware<T>>,
    callback: () => Promise<FetchResponse<T>>,
    index: number
  ): Promise<FetchResponse<T>> {
    const middleware = middlewares[index];
    if (!middleware) return callback();

    // entered 是这一层自己的：只约束「这一个中间件」的 next，别的中间件调自己的 next 不受影响
    let entered = false;
    const next = (): Promise<FetchResponse<T>> => {
      if (entered) {
        return Promise.reject(new Error("中间件错误：同一个中间件的 next() 只能调用一次"));
      }
      entered = true;
      return this.#executeMiddleware(middlewares, callback, index + 1);
    };

    // 用 then 包一层再调用：中间件同步抛错也变成 reject，外层中间件和调用方才能按洋葱模型接住
    return Promise.resolve()
      .then(() => middleware(this, next))
      .then(response => {
        if (!response) {
          throw new Error("中间件错误：中间件需要以 `return next()` 结束，拿到响应后也要 return 出去");
        }
        return response;
      });
  }

  /**
   * 生成最终要发出去的 URL 与初始化参数。
   * 对本层与子类开放：自定义传输（比如 `SSE`）靠它复用同一套 baseUrl / prefix / query / header 逻辑。
   */
  protected resolveFetchParams(uri: string | number | (string | number)[] = null, method: TMethods = null): {
    input: string;
    init: TFetchOptions;
  } {
    this.#uri = uri;
    this.#method = method = method ?? this.#method ?? "GET";

    const headers: Record<string, string> = { ...this.headers(), ...this.globalHeaders() };
    const { headers: optionHeaders, ...restOptions } = this.#options ?? {};
    if (optionHeaders) {
      if (optionHeaders instanceof Headers) {
        optionHeaders.forEach((value, key) => { headers[key] = value; });
      } else {
        Object.assign(headers, optionHeaders as Record<string, string>);
      }
    }

    // 方法与本层算出的请求头不能被 `options()` 里的同名字段覆盖，
    // 否则 init.method 会和下面「非 GET 才带 body」的判断对不上
    const options: TFetchOptions = {
      mode: "cors",
      ...restOptions,
      headers,
      method: method.toUpperCase()
    };

    if (!headers['content-type'] && !headers['Content-type'] && (this.#isPlainObject(this.#body) || Array.isArray(this.#body))) {
      headers['content-type'] = "application/json";
      this.#body = JSON.stringify(this.#body);
    }

    const uris: Array<string | number> = [];
    if (uri !== null && uri !== undefined) {
      Array.isArray(uri) ? uris.push(...uri) : uris.push(uri);
    }
    if (this.#prefix !== null && this.#prefix !== undefined) {
      Array.isArray(this.#prefix) ? uris.unshift(...this.#prefix) : uris.unshift(this.#prefix);
    }

    if (method !== "GET") {
      options.body = this.#body as BodyInit;
    }

    return {
      input: this.generateRequestUrl(this.#baseUrl, uris, this.#query),
      init: options
    };
  }

  /**
   * 用 `fetch` 发一次（默认 transport）。
   *
   * 对子类开放：要换发送实现（接进度、加埋点、换请求库）就覆写它，返回 `FetchResponse` 即可。
   * 但业务侧不要直接调用 —— 绕过 `send()` 会跳掉全部中间件。
   */
  protected async fetchByFetch<T>(input: string, init: TFetchOptions): Promise<FetchResponse<T>> {
    const response = await fetch(input, init);
    const headers = this.parseResponseHeaders(response.headers);
    const body = this.#parseBody<T>(await response.text(), headers);
    return new FetchResponse<T>(headers, response.status, body, response.ok, response);
  }

  /**
   * 用 `XMLHttpRequest` 发一次（`transport("xhr")` 时走这里，为了上传进度与老环境兼容）。
   *
   * 与 `fetchByFetch` 一样只对子类开放，业务侧请走 `send()`。
   */
  protected fetchByXHR<T>(input: string, init: TFetchOptions): Promise<FetchResponse<T>> {
    return new Promise<FetchResponse<T>>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(init.method ?? "GET", input, true);

      const headers = (init.headers ?? {}) as Record<string, string>;
      for (const key in headers) {
        xhr.setRequestHeader(key, headers[key]);
      }
      if (init.withCredentials) {
        xhr.withCredentials = true;
      }

      xhr.onload = () => {
        const responseHeaders = this.#parseXHRHeaders(xhr.getAllResponseHeaders());
        const body = this.#parseBody<T>(xhr.responseText, responseHeaders);
        resolve(new FetchResponse<T>(responseHeaders, xhr.status, body, xhr.status >= 200 && xhr.status < 300, xhr));
      };
      xhr.onerror = () => reject(new Error(`XHR 请求失败：${xhr.status} ${xhr.statusText}`));
      xhr.ontimeout = () => reject(new Error("XHR 请求超时"));
      xhr.onabort = () => reject(new Error("XHR 请求已中止"));

      xhr.send((init.body as any) ?? null);
    });
  }

  /**
   * 按 transport 把请求真正发出去（只负责发送，中间件由 `send` 负责）
   */
  protected fetch<ResponseData = any>(): Promise<FetchResponse<ResponseData>> {
    const { input, init } = this.resolveFetchParams(this.#uri, this.#method);
    switch (this.#transport) {
      case "xhr":
        return this.fetchByXHR<ResponseData>(input, init);
      default:
        return this.fetchByFetch<ResponseData>(input, init);
    }
  }

  /**
   * 发送请求：跑中间件 → 按 transport 发送 → 把 `FetchResponse` 原样交出去。
   *
   * 本层不判定成功 / 失败：HTTP 状态是多少就交多少，非 2xx 也是正常 resolve，
   * 成功与否只体现在 `response.success()` 上；中间件想改这个结论，就返回一个成功的
   * `FetchResponse`，链尾不会再把它翻回失败。
   *
   * 只有「没拿到响应」才 reject：网络异常（fetch 抛出的错误原样透传）与 XHR 的
   * onerror / ontimeout / onabort。也就是说 reject 表示「请求没发完」，不表示「请求失败」。
   */
  send<ResponseData = any>(uri: string | number | (string | number)[] = null, method: TMethods = null): Promise<FetchResponse<ResponseData>> {
    this.#uri = uri;
    this.#method = method ?? this.#method;

    return this.executeMiddleware<ResponseData>(this.resolveMiddlewares(), () => this.fetch<ResponseData>())
      .finally(() => this.reset());
  }

  /* ------------------------------- 解包钩子 ------------------------------- */

  /**
   * 把 `FetchResponse` 解包成业务想要的数据。
   * 协议差异（比如自研后端的 `{ code, message, data }`）由子类覆写，见 `KitRequest`。
   */
  protected unwrap<Result>(response: FetchResponse): Result {
    return response.body() as Result;
  }
}
