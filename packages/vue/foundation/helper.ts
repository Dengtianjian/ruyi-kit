/**
 * 判断「有值」：既不是 `undefined` 也不是 `null`。
 *
 * 注意名字与实际语义是反的 —— `undefinedOrNull` 读起来像「是 undefined 或 null」，
 * 实际返回的是「两者都不是」。改名的代价大于收益，用之前先按实现理解。
 *
 * 只排除 `undefined` / `null`，等价于 `value != null`：
 * `0`、`""`、`false`、`NaN` 都算有值，别拿它当「非空 / 真值」判断用。
 */
function undefinedOrNull(value: any): boolean {
  return value !== undefined && value !== null;
}

/**
 * 是否为数字（且已赋值）：先过 `undefinedOrNull`，再看 `typeof`。
 *
 * `NaN`、`Infinity` 也是 `number`，要求有限数字请自己再判 `Number.isFinite`；
 * 数字字符串（`"1"`）不算数字。
 */
function isNumber(value: any): boolean {
  return undefinedOrNull(value) && typeof value === 'number';
}

/**
 * 取值的类型名（小写）：`type([])` → `"array"`、`type(null)` → `"null"`、
 * `type(new Date())` → `"date"`、`type(() => {})` → `"function"`。
 *
 * 走 `Object.prototype.toString` 而不是 `typeof`：`typeof` 分不清数组 / 对象 / null
 * （分别得到 `"object"` / `"object"` / `"object"`），这里能分清；
 * 反过来，自定义了 `Symbol.toStringTag` 的对象会返回那个标签（`Promise` → `"promise"`）。
 */
function type(target: any): string {
  return Object.prototype.toString.call(target).split(" ")[1].slice(0, -1).toLowerCase();
}

/**
 * 通用小工具集合（默认导出单例）。
 * 统一从这里取，避免各处重复实现一套「判空 / 判类型」的小函数。
 */
export default {
  undefinedOrNull,
  isNumber,
  type
}
