/**
 * cookies — Cookie 读写封装
 *
 * 首次调用任意方法时，才会把 `document.cookie` 解析进模块级缓存对象，
 * 之后所有读写都只作用于这份**内存副本**：
 *
 * - `set()` / `remove()` **不会写回 `document.cookie`**，因此不持久化，
 *   刷新页面即失效，后续 HTTP 请求也不会携带。
 *   需要真正落盘请直接操作 `document.cookie` 或 `localStorage`。
 * - 解析只做一次，之后 `document.cookie` 的外部变动不会自动同步进来；
 *   需要重新同步时调用 `refresh()`。
 * - 非浏览器环境（SSR / worker / 单测）没有 `document`，
 *   按「没有任何 cookie」处理，不抛错。
 */

/** 是否已从 `document.cookie` 解析过；解析结果缓存在 {@link cookies} 中，全程只解析一次 */
let isParsed: boolean = false;

/**
 * `document.cookie` 的内存副本
 * 使用 `Object.create(null)` 创建，避免 `__proto__` 等特殊键名踩到原型链
 */
const cookies: Record<string, string> = Object.create(null);

/**
 * 解析 `document.cookie` 并写入内存缓存
 *
 * 容忍各种脏数据：没有 `=` 的片段、空键名、非法 URL 编码都不会让解析中断
 */
function parseCookie(): void {
  // 先置位，即便下方解析抛错也不会反复重试
  isParsed = true;

  // 非浏览器环境没有 document，按「无 cookie」处理
  if (typeof document === "undefined") return;

  document.cookie.split(";").forEach(splitItem => {
    const separatorIndex: number = splitItem.indexOf("=");
    // 跳过没有 = 的片段：document.cookie 为空串时 split 会产生一个空项
    if (separatorIndex < 0) return;

    const key: string = splitItem.slice(0, separatorIndex).trim();
    // 跳过空键名，避免 all() 里混入 { "": "" }
    if (key === "") return;

    const rawValue: string = splitItem.slice(separatorIndex + 1).trim();
    try {
      // cookie 值通常是 URL 编码的，这里解出明文；编码非法时回退为原样保留
      cookies[key] = decodeURIComponent(rawValue);
    } catch {
      cookies[key] = rawValue;
    }
  });
}

/** 确保缓存已完成首次解析（已解析则直接返回） */
function ensureParsed(): void {
  if (isParsed === false) parseCookie();
}

/**
 * 写入内存中的值
 *
 * 只改内存副本，不写 `document.cookie`，不持久化
 * @param key 键名
 * @param value 值
 */
function set(key: string, value: string): void {
  ensureParsed();
  cookies[key] = value;
}

/**
 * 读取值
 * @param key 键名
 * @returns 存在则返回其值（已 URL 解码），不存在返回空串
 */
function get(key: string): string {
  ensureParsed();
  return cookies[key] !== undefined ? cookies[key] : "";
}

/**
 * 从内存中删除
 *
 * 只删内存副本，不清除浏览器里真实存在的 cookie
 * @param key 键名
 * @returns 恒为 true（键不存在时同样返回 true）
 */
function remove(key: string): boolean {
  ensureParsed();
  delete cookies[key];
  return true;
}

/**
 * 判断键是否存在
 * @param key 键名
 */
function has(key: string): boolean {
  ensureParsed();
  return cookies[key] !== undefined;
}

/**
 * 获取全部键值
 *
 * @returns 内部缓存的**浅拷贝**，就地修改不会影响内部状态
 */
function all(): Record<string, string> {
  ensureParsed();
  return { ...cookies };
}

/**
 * 丢弃当前缓存并重新解析 `document.cookie`
 *
 * 外部（如服务端 Set-Cookie、其它 SDK）改动了真实 cookie 后调用，
 * 用于把内存副本同步到最新状态
 */
function refresh(): void {
  Object.keys(cookies).forEach(key => {
    delete cookies[key];
  });
  isParsed = false;
  parseCookie();
}

export default {
  set,
  get,
  remove,
  has,
  all,
  refresh
}
