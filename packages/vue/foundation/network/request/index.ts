/**
 * 新版请求层（逐步替代 `foundation/HTTP`），一个文件一个类：
 * - `Fetch.ts`          底层发送（fetch / xhr），一次请求一个实例
 * - `FetchResponse.ts`  响应实体
 * - `Request.ts`        便捷调用层（get / post / upload / polling / again …）
 * - `KitRequest.ts`     自研后端（X-Ajax + Bearer token + data 解包 + page / order 参数）
 * - `KitRestfulRequest.ts` 资源型接口的通用增删改查（继承 `KitRequest`）
 * - `sse/`              服务端推送长连接（独立于「一次请求一次响应」的模型）
 *
 * 失败口径统一：非 2xx / 重定向走 reject，值就是响应体本身（不包错误对象）。
 */
export { Fetch } from "./Fetch";
export type { TMethods, TBody, TTransport, TFetchMiddleware, TFetchOptions, IFetchConfig } from "./Fetch";
export { default as FetchResponse } from "./FetchResponse";
export type { TFetchResponseHeader } from "./FetchResponse";
export { Request } from "./Request";
export { default as KitRequest } from "./KitRequest";
export { default as KitRestfulRequest, Restful } from "./KitRestfulRequest";
export type { TKitRestfulMethods } from "./KitRestfulRequest";
export { default as DiscuzXRequest } from "./DiscuzXRequest";
export type { IKitRequestConfig } from "./KitRequest";
export * from "./sse";
