/**
 * 响应头。键统一为小写，方便 `header("content-type")` 直接取。
 */
export type TFetchResponseHeader = Record<string, string>;

/**
 * 请求后的响应实体。
 *
 * 只有它一个对象承载「响应」，传输方式（fetch / xhr）的差异都被抹平：
 * - `body()`     解析后的响应体（JSON 自动解析，否则为文本）
 * - `headers()`  响应头（键小写）
 * - `statusCode()` HTTP 状态码
 * - `success()` / `failed()` 这次响应的成功 / 失败（fetch 的 `ok`；XHR 按 2xx 口径补）
 * - `raw()`      底层对象（Response / XMLHttpRequest）
 *
 * 它只负责**记录**响应：库不会因为 `failed()` 抛错或跳过后续流程，要不要把它当失败，
 * 由中间件与调用方决定。它只描述「一次请求一次响应」；需要中途中止请用 `options.signal`，
 * 长连接请用 `SSE`（`SSEConnection` 有自己的 `close()`）。
 */
export default class FetchResponse<T = any> {
  #statusCode: number;
  #successfully: boolean;
  #failed: boolean;
  #headers: TFetchResponseHeader;
  #body: T;
  #raw: any;

  /**
   * @param headers    响应头
   * @param statusCode HTTP 状态码
   * @param body       响应体
   * @param success    是否成功，默认按 statusCode 是否为 2xx 判定（只是记录，不触发任何处置）
   * @param raw        底层对象（Response / XMLHttpRequest / EventSource）
   */
  constructor(
    headers: TFetchResponseHeader = {},
    statusCode: number = 200,
    body: T = null,
    success: boolean = statusCode >= 200 && statusCode < 300,
    raw: any = null
  ) {
    this.#successfully = success;
    this.#failed = !success;

    this.#headers = headers ?? {};
    this.#statusCode = statusCode;
    this.#body = body;
    this.#raw = raw;
  }

  headers(): TFetchResponseHeader {
    return this.#headers;
  }
  header(key: string, defaultValue: string = null): string {
    return this.#headers[key] ?? defaultValue;
  }
  statusCode(): number {
    return this.#statusCode;
  }
  success(): boolean {
    return this.#successfully;
  }
  failed(): boolean {
    return this.#failed;
  }
  body(): T {
    return this.#body;
  }
  /**
   * 底层对象：fetch 请求是 `Response`，xhr 请求是 `XMLHttpRequest`
   */
  raw<R = any>(): R {
    return this.#raw as R;
  }
}
