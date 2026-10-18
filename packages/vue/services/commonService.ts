/**
 * 通用小工具：生成随机字符串 / 随机 ID。
 *
 * 定位是「够用就好」的随机串（表单临时 key、上传任务 id、列表项 key 之类），
 * 底层是 `Math.random()`，**不是密码学安全**的随机源 ——
 * 不要拿它生成 token、盐、邀请码这类有安全含义的东西。
 */

/** 随机字符表：小写 + 数字 + 大写，共 62 个字符（变量名 `charts` 是 `charset` 的笔误，值为字符集） */
const charts: string = "qwertyuiopasdfghjklzxcvbnm0123456789QWERTYUIOPASDFGHJKLZXCVBNM";

/**
 * 从字符表里逐个随机拼出字符串。
 *
 * 已知问题：下标用的是 `Math.round(Math.random() * charts.length)`，取值区间是 `[0, 62]`
 * 而不是 `[0, 61]` —— 命中 62 时取到 `undefined`，结果里会多出一段字面量 "undefined"
 * （每个字符约 0.8% 概率，32 位的串约 23% 会中招）；而且 0 和 62 落在半格区间里，
 * 出现概率只有中间字符的一半。要修就是换成 `Math.floor(Math.random() * charts.length)`。
 *
 * @param length 要生成的字符个数；非整数时按「下标小于它」循环，如 7.5 会生成 8 个
 */
function genRandomString(length: number): string {
  let str: string = "";
  for (let index = 0; index < length; index++) {
    str += charts[Math.round(Math.random() * charts.length)];
  }
  return str;
}

export default {
  /**
   * 生成带分隔符的随机 ID，形如 `aB3dE1fG-hI2jK4lM-nO6pQ8rS-tU1vW3xY`。
   *
   * 两处与「`length` 就是最终长度」的直觉不一致，用之前注意：
   * - **实际长度是 `length + delimiterCount - 1`**：每段固定 `length / delimiterCount` 个字符，
   *   `join` 只插了 `delimiterCount - 1` 个分隔符，而开头那句 `length - delimiterCount`
   *   算完并没有被用到（`32 / 4` → 4 段 × 8 字符 + 3 个 "-" = 35 个字符）；
   * - **`delimiter` 传空串会退化**：此时 `delimiterCount` 被改成 1、`splitLength` 仍是初值 1，
   *   于是只返回 1 个随机字符，`length` 等于失效。
   *
   * 另外每段长度是 `length / delimiterCount`，除不尽时（`length = 30`、4 段 → 7.5）
   * 每段会多生成 1 个字符，实际总长再涨一截；`delimiterCount` 传 0 则一个随机字符都不生成。
   *
   * @param length         期望长度，默认 32（实际长度见上）
   * @param delimiter      分隔符，默认 "-"
   * @param delimiterCount 分成几段，默认 4
   * @param prefix         前缀，原样拼在最前面，不计入 `length`
   * @param suffix         后缀，原样拼在最后面，不计入 `length`
   */
  genUniqueId(length: number = 32, delimiter: string = "-", delimiterCount: number = 4, prefix: string = "", suffix: string = ""): string {
    const stringLength: number = length;
    let splitLength = 1;
    if (delimiter) {
      length = length - delimiterCount;
      splitLength = stringLength / delimiterCount;
    } else {
      delimiterCount = 1;
    }

    const randomStrs: string[] = [];
    for (let index = 0; index < delimiterCount; index++) {
      randomStrs.push(genRandomString(splitLength));
    }

    return `${prefix}${randomStrs.join(delimiter)}${suffix}`;
  }
}
