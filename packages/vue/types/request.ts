export interface IPageResponse<Data> {
  list: Data,
  pagination: {
    total: number,
    limit: number,
    page: number,
    skip: number,
    items: number
  }
}

export interface IKitResponse<T = null> {
  /** 状态，与 HTTP 状态码同口径；失败时也是它先暴露问题 */
  statusCode: number;
  /** 业务码，形如 `400002:UsernameOrPasswordMissing` */
  code: number | string;
  /** 业务数据；失败时同样存在（常为 `[]`），不能用「有没有 data」判断成败 */
  data: T;
  /** 面向用户的提示，失败时用它作错误信息 */
  message?: string;
  /** 错误明细 */
  details?: any;
  /** 后端处理耗时，如 `26ms` */
  requiredTime?: string;
  /** 后端版本号 */
  version?: string;
}

export type TKitResponsePage<T> = {
  list: T,
  pagination: {
    total: number,
    limit: number,
    page: number,
    skip: number,
    items: number
  }
}