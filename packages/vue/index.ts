/**
 * `kit/vue` 的导出入口。
 *
 * 这里只做「归类 + 转发」，不放任何实现；新增模块时按分组补一行即可。
 * 分组顺序按使用频率从高到低：请求层 → 基础工具 → 服务 → 类型 → 组合式函数。
 *
 * 与旧请求层相关的导出（`HTTP` / `request` / `discuzXRequest` / `RuyiRequest` / `naiveUI` /
 * `SettingFormService` 等）已随 `foundation/HTTP`、`services/native` 一起从本包移除，
 * 应用侧那条旧的 `Ruyi/Vue` 副本仍保留，需要旧实现请引用 `Ruyi/Vue` 下的路径。
 */

/* ------------------------------------ 请求层 ------------------------------------ */

/**
 * 新版请求层（`foundation/network/request`），一个文件一个类：
 * - `Fetch`          底层发送（fetch / xhr），一次请求一个实例
 * - `FetchResponse`  响应实体
 * - `Request`        便捷调用层（get / post / upload / polling / again …）
 * - `KitRequest`     自研后端（Bearer token + data 解包 + page / order 参数）
 * - `DiscuzXRequest` 在 `KitRequest` 上补 DiscuzX（社区）后端的参数约定
 * - `SSE` / `SSEConnection` 服务端推送长连接（独立于「一次请求一次响应」的模型）
 *
 * 失败口径统一：非 2xx / 重定向走 reject，值就是响应体本身（不包错误对象）。
 */
export { Fetch, FetchResponse, Request, KitRequest, DiscuzXRequest, SSE, SSEConnection } from "./foundation/network/request";
export type {
  TMethods, TBody, TTransport, TFetchMiddleware, TFetchOptions, IFetchConfig, TFetchResponseHeader,
  IKitRequestConfig,
  ISSEMessage, TSSEState, ISSEOptions, ISSEReconnectOptions, ISSEHeartbeatOptions
} from "./foundation/network/request";

/* ------------------------------------ 基础工具 ------------------------------------ */

/** 防抖 / 节流 */
export { debounce, throttle } from "./foundation/timing";
export type { TTimedFunction, IThrottleOptions } from "./foundation/timing";

/** 浏览器存储与文件相关 */
export { default as cookies } from "./foundation/cookies";
export { default as file } from "./foundation/file";

/** 事件总线（按频道名收发）、通用值 / 类型判断 */
export { default as eventBus } from "./foundation/eventBus";
export { default as helper } from "./foundation/helper";

/* -------------------------------------- 服务 -------------------------------------- */

export { default as commonService } from "./services/commonService";
export { default as dayjsService } from "./services/dayjsService";

/* -------------------------------------- 类型 -------------------------------------- */

/** 通用数据结构（文件信息、上传鉴权 …） */
export * from "./types/common";
/** Naive UI 菜单相关：路由 meta 与菜单项类型 */
export * from "./types/native/menu";
/** 路由记录的类型增强（可携带业务 meta） */
export * from "./types/router";

/* ----------------------------------- 组合式函数 ----------------------------------- */

export { default as useRouteTableChange } from "./composables/useRouteTableChange";
export { default as useWindowBreakpoints } from "./composables/useWindowBreakpoints";
export type { TWindowBreakpointMode, TWindowBreakpoints, IWindowBreakpointTiming } from "./composables/useWindowBreakpoints";
