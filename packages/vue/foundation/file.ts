/**
 * 文件相关小工具。
 * 目前只有一件事：把本地文件读成 DataURL（上传前的本地预览都用它）。
 */

/**
 * 复用的 FileReader 实例：读文件不是高频操作，没必要每次 `new` 一个。
 *
 * 代价是**不能并发** —— 上一次还没读完就再调，`readAsDataURL` 会终止前一次读取
 * （两次都走 `onloadend`，结果都是 null）。要同时读多张图，请各自 `new FileReader()`。
 */
const fileRender: FileReader = new FileReader();

/**
 * 把本地文件读成 DataURL（`data:image/png;base64,...`），可直接塞进 `<img src>`。
 *
 * 用 `onloadend` 收结果：成功和失败都走它，所以失败（文件损坏、读取被中止、并发冲突）
 * 时 `target.result` 是 null，Promise 依然 resolve —— 断言成 `string` 只是给调用侧的方便，
 * 实际拿到的可能是 null，用之前自己判一下。
 *
 * @param file 要读取的文件
 * @returns 文件的 DataURL
 */
function renderImage(file: File): Promise<string> {
  fileRender.readAsDataURL(file);
  return new Promise((resolve) => {
    fileRender.onloadend = fr => {
      resolve(fr.target?.result as string);
    }
  })

}

export default {
  renderImage
}
