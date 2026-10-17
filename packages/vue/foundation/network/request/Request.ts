import { ref, type Ref } from "vue";
import { Fetch, type TBody, type IFetchConfig, type TMethods } from "./Fetch";
import FetchResponse from "./FetchResponse";
import { SSE, type SSEConnection, type ISSEOptions } from "./sse";

/**
 * 在 Fetch 之上提供更顺手的调用方法（get / post / upload / polling / again / sse …）。
 *
 * 关键点：**每次发送都会实例化一个独立的 `Fetch`**。
 * 旧 HTTP 层的问题是参数存在实例上、请求之间互相污染（a 接口的 query 会带到 b 接口），
 * 这里的做法是：`#dispatch` 先把当前配置快照进一个新的 `Fetch`，再立刻 `reset()` 自己，
 * 真正发送的是那个一次性 `Fetch`。所以同一个 `Request` 实例串行、并发发请求都不会串参数。
 *
 * 这里只放「与后端无关」的调用方式；某个后端特有的参数约定（比如自研后端的 `page` / `order`）
 * 属于那一层，见 `KitRequest`。
 *
 * 与 `Fetch` 的另一个区别是**这里判定成功 / 失败**：`Fetch` 不判定（非 2xx 也 resolve），
 * 本层把「非 2xx」与「重定向」当作失败走 reject，且**不包错误对象** ——
 * reject 的值就是响应体本身（JSON 已解析，否则为文本）。
 * 于是 `get` / `post` / `again()` 的 Promise 口径统一了：resolve 就是拿到了可用数据，
 * catch 到的就是失败那次后端返回的内容。
 */
export class Request extends Fetch {
  /**
   * 上一次请求（uri + 本次参数快照），`again()` 靠它原样重发。
   * 记录的是「上一次」而不是「本次」，所以 `reset()` 不清它。
   */
  #last?: { uri: string | number | (string | number)[]; config: IFetchConfig };

  /**
   * 发送一次请求：快照 -> 记下这次请求（供 `again()` 重发）-> 清空本次参数
   * -> 用独立 Fetch 发送 -> 分流（非 2xx / 重定向走 reject，值为响应体）-> 交给 `unwrap` 解包
   */
  protected dispatch<ResponseData = any>(
    uri: string | number | (string | number)[] = null,
    method: TMethods = null
  ): Promise<ResponseData> {
    const last = this.#last = { uri, config: this.toConfig(method) };
    this.reset();

    return this.#sendOnce<ResponseData>(last.uri, last.config);
  }

  /**
   * 用一份快照发一次，并把结果交给 `unwrap` 解包（`dispatch` 与 `again()` 共用）。
   *
   * 每轮都新建 `Fetch`：`Fetch` 是执行体、跑完自己 `reset()`，所以同一份快照可以反复用，
   * 也不会被上一轮改动（比如 body 的 JSON 化只发生在执行体身上）。
   */
  #sendOnce<ResponseData = any>(
    uri: string | number | (string | number)[],
    config: IFetchConfig
  ): Promise<ResponseData> {
    return new Fetch(config).send<any>(uri).then(response => this.#unwrapResponse<ResponseData>(response));
  }

  /**
   * 判断这次响应是不是「被重定向过」。
   *
   * 两个来源，覆盖不同的 redirect 设置：
   * - 状态码落在 3xx：没有自动跟随重定向时才看得到它（`options("redirect", "manual")`、自定义 transport）；
   * - 底层标记为已重定向：fetch 默认自动跟随，最终拿到的是跳转**之后**的响应（状态码往往还是 2xx），
   *   只有 `Response.redirected` 能说明中途跳了一次 —— 跳登录页就是这种，必须拦下来。
   *
   * 已知限制：XHR 同样自动跟随、且没暴露等价标记，它这里只能靠 3xx 兜住。
   */
  protected isRedirected(response: FetchResponse): boolean {
    const statusCode: number = response.statusCode();
    if (statusCode >= 300 && statusCode < 400) {
      return true;
    }

    const raw = response.raw<any>();
    return raw ? raw.redirected === true : false;
  }

  /**
   * 解包一次响应：失败直接把响应体作为 reject 值（重定向 / 非 2xx），成功才交给 `unwrap`。
   *
   * 不包错误对象：`catch` 到的就是响应体本身（JSON 已解析，否则是文本）。
   * 需要状态码、响应头的失败场景用 `Fetch.send()`，拿完整 `FetchResponse`。
   */
  #unwrapResponse<ResponseData = any>(response: FetchResponse): ResponseData {
    if (this.isRedirected(response) || response.failed()) {
      // 失败走 reject 通道：值就是响应体，调用方 catch 到什么取决于后端返回什么
      throw response.body();
    }
    return this.unwrap<ResponseData>(response);
  }

  /**
   * 重新发起上一次请求，失败可以自动重试。
   *
   * 把「上一次请求」原样再发一遍：同一个 uri、同一份本次参数（query / body / 请求头 / options，
   * 都是上次调用时的快照）。长期配置同样来自那份快照，但中间件每轮都会重跑，所以 token 取的是当前值。
   *
   * `retry` 就是「失败后自动重试的次数」，设了就自动、不设就是手动：
   * - 不传（0）：只发一次，失败直接抛出 —— 手动重发
   * - 传 n：失败才自动接着发，最多重试 n 次（算上首发，总共最多发 n + 1 次）
   *
   * 拿到结果就结束，成功不会空跑；重试用尽还是失败，抛出最后一次的错误。
   * 抛错都算失败：网络异常、重定向、非 2xx，以及 `unwrap` 里的业务校验。
   * 还没发过请求时调用会抛错。
   *
   * @param retry 失败后自动重试的次数，默认 0（只发一次）
   * @returns 那一次成功的响应结果
   */
  async again<ResponseData = any>(retry: number = 0): Promise<ResponseData> {
    const last = this.#last;
    if (!last) {
      throw new Error("Request.again()：还没有发过请求，没有可以重新发起的请求");
    }
    if (!Number.isInteger(retry) || retry < 0) {
      throw new Error("Request.again()：retry 需要是不小于 0 的整数（0 表示只发一次）");
    }

    for (let attempt = 0; ; attempt++) {
      try {
        return await this.#sendOnce<ResponseData>(last.uri, last.config);
      } catch (error) {
        // 重试用尽，把最后一次的错抛出去
        if (attempt >= retry) {
          throw error;
        }
      }
    }
  }

  /**
   * 发送 GET 请求
   * @param uri URI
   * @param query 查询参数
   */
  get<ResponseData = any>(uri: string | string[] = null, query: Record<string, number | string> = null): Promise<ResponseData> {
    this.queries(query ?? {});
    return this.dispatch<ResponseData>(uri, "GET");
  }
  /**
   * 发送 POST 请求
   * @param uri URI
   * @param bodyData 请求体
   */
  post<ResponseData = any>(uri: string | string[] = null, bodyData: TBody = null): Promise<ResponseData> {
    if (bodyData) {
      this.body(bodyData);
    }
    return this.dispatch<ResponseData>(uri, "POST");
  }
  /**
   * 发送 PUT 请求
   * @param uri URI
   * @param bodyData 请求体
   */
  put<ResponseData = any>(uri: string | string[] = null, bodyData: TBody = null): Promise<ResponseData> {
    if (bodyData) {
      this.body(bodyData);
    }
    return this.dispatch<ResponseData>(uri, "PUT");
  }
  /**
   * 发送 DELETE 请求
   * @param uri URI
   * @param bodyData 请求体
   */
  delete<ResponseData = any>(uri: string | string[] = null, bodyData: TBody = null): Promise<ResponseData> {
    if (bodyData) {
      this.body(bodyData);
    }
    return this.dispatch<ResponseData>(uri, "DELETE");
  }
  /**
   * 发送 PATCH 请求
   * @param uri URI
   * @param bodyData 请求体
   */
  patch<ResponseData = any>(uri: string | string[] = null, bodyData: TBody = null): Promise<ResponseData> {
    if (bodyData) {
      this.body(bodyData);
    }
    return this.dispatch<ResponseData>(uri, "PATCH");
  }

  /**
   * 上传文件（multipart/form-data）
   * @param uri URI
   * @param file 文件
   * @param fileName FormData 的附加文件名键
   * @param body 其它要一起提交的字段
   */
  upload<ResponseData = any>(
    uri: string | string[] = null,
    file: File,
    fileName: string = null,
    body: Record<string, string> = {}
  ): Promise<ResponseData> {
    const form: FormData = new FormData();
    for (const key in body) {
      form.append(key, body[key]);
    }
    form.append("file", file);
    if (fileName) {
      form.append("fileName", fileName);
    }

    this.body(form);
    return this.dispatch<ResponseData>(uri, "POST");
  }

  /**
   * 建立 SSE 连接（长连接、服务端推送）。
   * URL / 请求头 / 中间件与其它请求完全一致，所以 `KitRequest` 的 Bearer token 也会带上。
   *
   * 断线重连与心跳跟着这条连接走，选项只对这一次连接生效、不落到实例上
   * （`reconnect` 默认开，`heartbeat` 默认关）。连接本身的消费方式见 `SSEConnection`。
   *
   * @param uri URI
   * @param method 请求方法，默认 GET
   * @param options 这条连接的行为：自动重连与心跳，见 `ISSEOptions`
   */
  sse(uri: string | string[] = null, method: TMethods = "GET", options: ISSEOptions = {}): Promise<SSEConnection> {
    const sender = new SSE(this.toConfig(method));
    this.reset();
    return sender.connect(uri, method, options);
  }

  /**
   * 轮询：每轮间隔 `waitDuration` 秒发一次请求，直到 `breakCallback` 返回 true、
   * 请求失败、或 `stopRequest` 被置为 true。
   *
   * 「请求失败」与本层其它调用同一口径：网络异常、非 2xx、重定向都会抛错，
   * 一旦抛错轮询就整体 reject（不会带着一个错误响应继续问下一轮），要容错就在外面 catch。
   *
   * 目标用 uri 指定（和 `get` / `post` 一致），不需要自己包一层闭包；
   * 请求方法取实例上的配置（默认 GET，需要 POST 时 `method("POST")`）。
   *
   * 为什么 uri 不能省：实例持有的只是「长期配置」（baseUrl / prefix / 长期请求头 / 中间件 / transport），
   * 本次请求的 uri、query、body 在每次 `dispatch` 后都会被 `reset()` 清掉 —— 这是本层防止请求之间串参数的前提，
   * 所以实例本身并不代表某一次具体请求。
   *
   * 对应的取舍：轮询期间参数固定为调用时的快照（轮询本来就是反复问同一个问题）。
   * 如果每轮要换参数（翻页等），直接写循环比传闭包更直白。
   *
   * @param uri URI
   * @param breakCallback 拿到结果后判断是否结束轮询，返回 true 结束
   * @param waitDuration 每轮等待时长（秒）
   * @param stopRequest 外部可手动置 true 停止轮询
   */
  async polling<ResponseData = any>(
    uri: string | number | (string | number)[] = null,
    breakCallback: (res: ResponseData) => boolean,
    waitDuration: number = 2,
    stopRequest: Ref<boolean> = ref(false)
  ): Promise<ResponseData> {
    const method = this.method();
    // 快照一次：每轮 dispatch 都会 reset 掉本次参数，而轮询要用的恰恰是这一份
    const config = this.toConfig(method);
    this.reset();

    while (true) {
      if (stopRequest.value) {
        stopRequest.value = false;
        return undefined as unknown as ResponseData;
      }

      await new Promise<void>(resolve => setTimeout(resolve, waitDuration * 1000));

      const sender = new Fetch(config);
      const response = await sender.send<any>(uri, method).then(res => this.#unwrapResponse<ResponseData>(res));
      if (breakCallback(response) === true) {
        return response;
      }
    }
  }
}
