/** 上传项状态 */
export type TUploadFileStatus = 'pending' | 'uploading' | 'finished' | 'error';

/**
 * 上传组件里的文件项。
 *
 * 组件只认 `id`（列表 key / 删除时定位）与 `name`（展示名），其余字段原样保留，
 * 业务可以在此基础上扩展（例如把后端存储记录直接作为文件项传进来）。
 * 末尾的索引签名就是给这些扩展字段留的口子。
 */
export type TUploadFileInfo = {
  /** 唯一标识：列表 key、删除时定位 */
  id?: string | number,
  /** 展示名 */
  name?: string,
  /** 预览 / 下载地址（点击文件名打开的那个） */
  url?: string,
  /** 预览图地址（缩略图，图片类文件列表里展示用） */
  thumbnailUrl?: string,
  /** 文件大小（字节） */
  size?: number,
  /** 状态 */
  status?: TUploadFileStatus,
  /** 上传进度（0 - 100） */
  percentage?: number,
  /** 原始文件（需要本地预览时保留） */
  file?: File,
  [key: string]: unknown
};

/** 上传（`@upload`）：入参是原始文件，返回上传后的文件信息；返回空视为放弃本次上传 */
export type TUploadHandler = (file: File) => Promise<TUploadFileInfo> | TUploadFileInfo;

/** 删除（`@delete`）：返回 `true` 才从列表移除，`false`（或抛错）则保留 */
export type TUploadDeleteHandler = (file: TUploadFileInfo) => Promise<boolean> | boolean;

/** 列表变化（`@change`） */
export type TUploadChangeHandler = (files: Array<TUploadFileInfo>) => void;
