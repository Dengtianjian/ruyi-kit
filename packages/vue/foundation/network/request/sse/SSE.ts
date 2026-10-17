import { Fetch, type IFetchConfig, type TMethods } from "../Fetch";
import FetchResponse from "../FetchResponse";
import { SSEConnection } from "./SSEConnection";
import type { ISSEOptions } from "./types";

/**
 * 服务端推送（SSE）连接类。
 *
 * 只继承 `Fetch` 的配置与 URL 生成能力（baseUrl / prefix / query / header / options / 中间件），
 * 动词类方法请用 `Request`。
 *
 * 为什么不用原生 `EventSource`：
 * - `EventSource` **不允许自定义请求头**，而 `KitRequest` 的鉴权正是 `Authorization: Bearer <token>`，
 *   用 EventSource 会静默丢掉 —— 这种「配置了但没生效」是最难排查的一类问题；
 * - `EventSource` 只支持 `GET`，且拿不到响应头、拿不到状态码。
 *
 * 因此这里用 `fetch` + `ReadableStream` 自己解析 SSE 帧，重连也自己管：
 * 断线（网络错误 / 非 2xx / 心跳超时）会自动重连，靠 `heartbeat` 把
 * 「流已经死了却一声不吭」也变成一次能被发现、能重连的异常。
 *
 * ```ts
 * const api = new KitRequest({ baseUrl: "/api" });
 * const connection = await api.sse("task/stream", "GET", {
 *   reconnect: { maxRetries: 5 }, // 最多重连 5 次，默认不限
 *   heartbeat: 30                 // 30 秒没收到服务端数据当作断线，默认关闭
 * });
 * for await (const { event, data } of connection) {
 *   console.log(event, JSON.parse(data));
 * }
 * ```
 */
export class SSE extends Fetch {
  /**
   * 建立连接：连接成功（响应 2xx）即 resolve，之后消息通过 `SSEConnection` 消费。
   *
   * 请求头与 URL 都用当前配置生成，并且和普通请求走同一条中间件链路
   * （`resolveMiddlewares()` + `executeMiddleware`），所以 `query()` / `header()` / 中间件都生效 ——
   * 包括 `KitRequest` 的 `Authorization: Bearer <token>`；响应头也会回传给中间件。
   *
   * 这里刻意不读取响应体：SSE 是长连接，`response.text()` 会一直等到流结束。
   * 请求发出后立刻 `reset()`，参数不会串到下一次 —— 之后每次重连都用这时快照下来的配置。
   *
   * 返回的 Promise 只代表「首次连接」：连不上（网络错误 / 非 2xx）直接 reject，
   * 让调用方立刻知道；自动重连只管已建立的连接之后的断开，不给首次连接兜底
   * （原因见 `SSEConnection`）。
   */
  async connect(
    uri: string | number | (string | number)[] = null as any,
    method: TMethods = "GET",
    options: ISSEOptions = {}
  ): Promise<SSEConnection> {
    const config = this.toConfig(method);
    this.reset();

    const connection = new SSEConnection(signal => this.#openConnection(config, uri, method, signal), options);
    return connection.ready();
  }

  /**
   * 开一轮连接：按配置快照发一次请求，成功交出 reader。`SSEConnection` 首次连接与每次重连都调它。
   *
   * 每轮都新建一个 `SSE` 实例来发（同 `Request.#sendOnce` 的思路）：中间件每轮重跑，
   * 所以 token 这类东西取的是当前值，而不是断线前那一刻的。
   * URL 与请求头在最内层才计算（中间件之后），中间件里设的请求头才来得及生效。
   *
   * `signal` 由 `SSEConnection` 给：主动 `close()` 与心跳超时都靠它掐断当前这一轮。
   */
  async #openConnection(
    config: IFetchConfig,
    uri: string | number | (string | number)[],
    method: TMethods,
    signal: AbortSignal
  ): Promise<ReadableStreamDefaultReader<Uint8Array>> {
    const sender = new SSE(config);

    const open = async (): Promise<FetchResponse> => {
      const { input, init } = sender.resolveFetchParams(uri, method);
      const headers: Record<string, string> = {
        accept: "text/event-stream",
        ...(init.headers as Record<string, string>)
      };

      const response = await fetch(input, { ...init, headers, signal });
      return new FetchResponse(sender.parseResponseHeaders(response.headers), response.status, null, response.ok, response);
    };

    const response = await sender.executeMiddleware<any>(sender.resolveMiddlewares(), open);
    const raw = response.raw<Response>();

    if (response.failed()) {
      throw new Error(`SSE 连接失败：${response.statusCode()} ${raw?.statusText ?? ""}`.trim());
    }
    if (!raw?.body) {
      throw new Error("SSE 连接失败：当前环境不支持流式响应");
    }

    return raw.body.getReader();
  }
}
