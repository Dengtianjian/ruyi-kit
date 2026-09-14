/**
 * SSE（服务端推送）子层，一个文件一个类：
 * - `SSE.ts`           连接的发起（继承 Fetch 的配置与 URL 生成能力）
 * - `SSEConnection.ts` 一条连接（异步迭代 + 回调 + 自动重连 + 心跳）
 * - `SSEParser.ts`     字节流 -> SSE 帧的解析（内部实现，不对外导出）
 * - `types.ts`         消息实体、连接状态与建连选项类型
 */
export { SSE } from "./SSE";
export { SSEConnection } from "./SSEConnection";
export type { ISSEMessage, TSSEState, ISSEOptions, ISSEReconnectOptions, ISSEHeartbeatOptions } from "./types";
