import { UploadFileInfo } from "naive-ui";
import { TStorageInfo } from "../types/storage";

/**
 * 存储相关的纯函数工具集。
 *
 * 只做「文件访问地址、后端存储记录」与「前端要用的字段（前缀、key、签名参数、naive-ui 上传项）」之间的换算，
 * 不发请求、不读写本地存储，所以导出的是一个无状态对象（不是类，也不需要实例化）。
 *
 * 地址形态按自研后端 + 对象存储的约定：
 * `https://host/files/<业务路径>/<文件名>.<扩展名>[/<层级…>]?signature=…&key-time=…&action=preview`
 * 其中 `files` 是存储前缀（磁盘），其后整段是对象 `key`，`?` 之后是对象存储的签名 / 处理参数。
 */
export default {
  /**
   * 把文件访问地址拆成各个字段。
   *
   * 拆解顺序：
   * 1. `uri`：`pathname` 去掉首部 `/`（协议、域名、端口在解析时已丢弃，但 `url` 本身原样返回）
   * 2. `prefix`：存储前缀。传了 `prefix` 就从 `uri` 里剥掉 `<prefix>/`；没传就拿 `uri` 的第一段当前缀
   *    （`files/pushs/a.png` → `prefix = "files"`），剩下的部分才是 `key`
   * 3. `key` / `suffix`：`key` 里若出现「扩展名后面还跟着层级」（如 `a/b.png/1/2`），以扩展名为界切开 ——
   *    `key` 取到扩展名为止（`a/b.png`），`suffix` 取剩余层级（`1/2`，没有该层级就是 `null`）
   * 4. `params`：query 参数收进普通对象，值已被 `URLSearchParams` 解码（再 `encodeURIComponent` 会二次编码）
   *
   * 注意：
   * - `url` 必须是**绝对地址**：`new URL()` 解析相对地址会直接抛错；签名参数是地址的一部分，不能先剥掉再传
   * - 传了 `prefix` 而地址并不是这个前缀时，`key` 不会被裁剪（不报错，也不做推断），调用方需自行判断
   * - 返回值里的 `prefix` 是「实际生效的前缀」，未传且地址里没有 `/` 时为 `null`
   * - 切分 `key` / `suffix` 用的是 `\w` 字符类，文件名含 `-` 之类的字符时只会匹配到该字符之后的部分，
   *   这种地址建议直接传 `prefix` 并自行处理，或用返回的 `uri` 兜底
   *
   * @param url 文件访问地址（绝对地址，可带签名 / 处理参数的 query）
   * @param prefix 存储前缀（如 `files`）；不传则从地址第一段推导
   * @returns 原地址 `url`、`uri`（去首 `/` 的路径）、生效的 `prefix`、对象 `key`、扩展名之后的 `suffix`、`params`（query 参数）
   */
  parseFileUrl(url: string, prefix: string = null): {
    url: string,
    uri: string,
    prefix: string,
    key: string,
    suffix: string,
    params: Record<string, string>
  } {
    const fileURL = new URL(url);
    const uri = fileURL.pathname.slice(1);
    let key = uri;
    let suffix: string = null;
    if (prefix) {
      key = key.replace(`${prefix}/`, "");
    } else {
      let firstSepIndex = key.indexOf("/");

      if (firstSepIndex > -1) {
        prefix = key.slice(0, firstSepIndex);
        key = key.slice(firstSepIndex + 1);
      }
    }

    if (/\.\w+\/(.+)?/.test(key)) {
      const keyMatched = key.match(/([\w\/]+\.\w+)(\/(.+))?/);
      key = keyMatched[1];
      suffix = keyMatched[3] || null;
    }
    const params: Record<string, string> = {};
    fileURL.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    return {
      url,
      uri,
      prefix,
      key,
      suffix,
      params
    }
  },
  /**
   * 把后端的存储记录转成 naive-ui 的上传项（`UploadFileInfo`）。
   *
   * 只填渲染文件列表必需的几项：
   * - `id` 用 `key`：naive-ui 靠 `id` 去重、定位要增删的项，所以它必须和存储里的对象一一对应
   * - `status` 固定 `"finished"`：记录已经存在于存储，不是正在上传的临时项（否则会显示进度条）
   * - `name` 优先 `source_file_name`（用户上传时的原始文件名），退回 `name`（存储里的文件名）
   *
   * `url` 故意留 `null`：记录里只有 `key`，预览地址还要配访问控制与签名，得由调用方按需换取；
   * 这里硬拼出来的链接大概率打不开（或直接 403），不如不填。
   *
   * @param storageFile 后端返回的存储记录
   * @returns 可直接放进 naive-ui 文件列表的上传项
   */
  storageFileToUploadFile(storageFile: TStorageInfo): UploadFileInfo {
    return {
      id: storageFile.key,
      status: "finished",
      url: null,
      name: storageFile.source_file_name || storageFile.name
    }
  },
  /**
   * 把文件访问地址转成 naive-ui 的上传项（`UploadFileInfo`）。
   *
   * 与 `storageFileToUploadFile` 的区别只在数据来源：这里手上只有地址（常见于后端只回了 URL、
   * 或从表单里读回的历史值），所以 `id` / `name` 都取自地址解析出的对象 `key`，
   * 而 `url` 原样填回 —— 这个地址本来就是可访问的，列表里可以直接点开预览。
   *
   * 地址不是绝对地址时 `parseFileUrl` 会抛错，调用方需自行保证格式（或先 try/catch）。
   *
   * @param url 文件访问地址（绝对地址，可带签名 / 处理参数）
   * @returns 可直接放进 naive-ui 文件列表的上传项
   */
  fileUrlToUploadFile(url: string): UploadFileInfo {
    const urlInfo = this.parseFileUrl(url);
    return {
      id: urlInfo.key,
      status: "finished",
      url,
      name: urlInfo.key
    }
  }
}
