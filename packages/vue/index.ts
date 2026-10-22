export { Fetch, FetchResponse, Request, KitRequest, KitRestfulRequest, Restful, DiscuzXRequest, SSE, SSEConnection } from "./foundation/network/request";
export type {
  TMethods, TBody, TTransport, TFetchMiddleware, TFetchOptions, IFetchConfig, TFetchResponseHeader,
  IKitRequestConfig, TKitRestfulMethods,
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
export { default as storageService } from "./services/storageService";
/** 菜单路由筛选：按父级名称与级别，从路由表里取 `NaiveRouterMenu` 的 `routes` */
export * from "./services/native/menu";

/* -------------------------------------- 类型 -------------------------------------- */

/** 通用数据结构（文件信息、上传鉴权 …） */
export * from "./types/common";
/** Naive UI 菜单相关：路由 meta 与菜单项类型 */
export * from "./types/native/menu";
/** 路由记录的类型增强（可携带业务 meta） */
export * from "./types/router";
export * from "./types/storage";
export * from "./types/request";

/* -------------------------------------- 组件 -------------------------------------- */

export * from "./components";

/* ----------------------------------- 组合式函数 ----------------------------------- */

export { default as useRouteTableChange } from "./composables/useRouteTableChange";
export { default as useWindowBreakpoints } from "./composables/useWindowBreakpoints";
export type { TWindowBreakpointMode, TWindowBreakpoints, IWindowBreakpointTiming } from "./composables/useWindowBreakpoints";
