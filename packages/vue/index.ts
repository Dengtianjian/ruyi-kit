export { default as useRouteTableChange } from "./composables/useRouteTableChange";
export { default as useWindowBreakpoints } from "./composables/useWindowBreakpoints";
export type { TWindowBreakpointMode, TWindowBreakpoints, IWindowBreakpointTiming } from "./composables/useWindowBreakpoints";

export { debounce, throttle } from "./foundation/timing";
export type { TTimedFunction, IThrottleOptions } from "./foundation/timing";

export { default as cookies } from "./foundation/cookies";
export { default as eventBus } from "./foundation/eventBus";
export { default as file } from "./foundation/file";
export { default as helper } from "./foundation/helper";
export { default as naiveUI } from "./foundation/naiveUI";

export { default as RuyiRequest } from "./foundation/HTTP/RuyiRequest";
export { default as request } from "./foundation/HTTP/request";
export { default as HTTP } from "./foundation/HTTP";
export * from "./foundation/HTTP";
export { default as discuzXRequest } from "./foundation/HTTP/discuzXRequest";

/**
 * 新版请求层（foundation/network/request），逐步替代 foundation/HTTP：
 * Fetch — 底层发送（fetch / xhr）
 * FetchResponse — 响应实体
 * Request — 便捷调用层，每次发送实例化独立 Fetch
 * KitRequest — 自研后端（X-Ajax + Bearer token + data 解包）
 * SSE — 服务端推送长连接（独立于 Fetch 的一次请求一次响应模型）
 */
export { Fetch, FetchResponse, Request, KitRequest, SSE, SSEConnection } from "./foundation/network/request";
export type { TTransport, TFetchMiddleware, TFetchOptions, IFetchConfig, TFetchResponseHeader, ISSEMessage, TSSEState, ISSEOptions, ISSEReconnectOptions, ISSEHeartbeatOptions } from "./foundation/network/request";

export { default as DiscuzXSettingFormService } from "./services/discuzX/DiscuzXSettingFormService";
export { default as commonService } from "./services/commonService";
export { default as dayjsService } from "./services/dayjsService";
export * from "./services/naiveRouterMenuService";
export { default as naiveUIService } from "./services/naiveUIService";
export { default as SettingFormService } from "./services/SettingFormService";

export * from "./types/common";
export * from "./types/components/Common";
export * from "./types/components/NaiveUI";