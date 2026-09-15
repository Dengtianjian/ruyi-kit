import { Request } from "./Request";
import FetchResponse from "./FetchResponse";
import type { IFetchConfig, TFetchMiddleware } from "./Fetch";

/**
 * 自研后端的统一响应体。
 *
 * 字段缺失时按「不是这个协议的响应」处理（比如接口直接吐数组、或响应不是 JSON），
 * 所以每个字段都是可选的，判定时只信真的读到的值。
 *
 * @template T `data` 的类型，默认 `null` 表示「不关心 data」—— 判定成败只看状态，用不到它。
 *   `unwrap` 解包时传入业务要的类型（`get<User[]>()` 的 `User[]` 就是它），解包结果即 `data: T`。
 */
export interface IKitResponseBody<T = null> {
  /** 状态，与 HTTP 状态码同口径；失败时也是它先暴露问题 */
  statusCode?: number;
  /** 业务码，形如 `400002:UsernameOrPasswordMissing` */
  code?: number | string;
  /** 业务数据；失败时同样存在（常为 `[]`），不能用「有没有 data」判断成败 */
  data?: T;
  /** 面向用户的提示，失败时用它作错误信息 */
  message?: string;
  /** 错误明细 */
  details?: any;
  /** 后端处理耗时，如 `26ms` */
  requiredTime?: string;
  /** 后端版本号 */
  version?: string;
}

/**
 * `KitRequest` 的构造配置：在 `Fetch` 的配置之上补自研后端的数据转换指令与 token 键名
 */
export interface IKitRequestConfig extends IFetchConfig {
  /** 数据转换指令（会拼成 `_transform` 查询参数） */
  transforms?: string[];
  /** token 在 `localStorage` 里的键名，默认 `"token"`（过期时间存 `${tokenName}_expiresAt`） */
  tokenName?: string
}

/**
 * token 在 `localStorage` 里的键名，过期时间存 `${tokenName}_expiresAt`。
 *
 * 注意它是**模块级**的：鉴权中间件与 `tokenHandle` 读的都是这一个变量，
 * 所以 `IKitRequestConfig.tokenName` 换掉的是「整个模块用的键名」，不是某个实例的。
 */
let tokenName = "token";

/**
 * 处理响应头里的鉴权信息（自研后端的约定：`X-Auth-Token` + `X-Auth-Token-Expires-At`）。
 *
 * 两个头都没有就当 token 已失效，直接清掉本地存储；有就写回 ——
 * 但只在 token 变了的时候写（过期时间跟着更新），避免每次请求都动一遍 `localStorage`。
 */
function tokenHandle(headers: Record<string, string>): void {
  const token: string = headers['X-Auth-Token'];
  const tokenExpiresAt: string = headers['X-Auth-Token-Expires-At'];

  if (!token && !tokenExpiresAt) {
    localStorage.removeItem(tokenName);
    localStorage.removeItem(`${tokenName}_expiresAt`);
    return;
  }

  if (localStorage.getItem(tokenName) !== token) {
    localStorage.setItem(tokenName, token);
    localStorage.setItem(`${tokenName}_expiresAt`, (Number(tokenExpiresAt) * 1000).toString());
  }
}

/**
 * 自研后端的鉴权中间件（长期中间件，会被快照进每次请求的 Fetch 里）。
 *
 * 它只做两件事：请求前在 token 未过期时带上 `Authorization: Bearer <token>`；
 * 请求后把回执里的 `X-Auth-Token` / `X-Auth-Token-Expires-At` 写回本地存储。
 *
 * 这里不对响应做成功 / 失败判定，只看服务端有没有回这两个头：
 * 没回就当作失效清掉。要改这个策略（比如「只在成功响应上刷新 token」），
 * 用 `use()` 在业务侧加一个自己的中间件，而不是往库里的判定里加分支。
 */
const authMiddleware: TFetchMiddleware = async (fetch, next) => {
  const token = localStorage.getItem(tokenName);
  const tokenExpiresAt = localStorage.getItem(`${tokenName}_expiresAt`);
  if (token && Number(tokenExpiresAt) > Date.now()) {
    fetch.header("Authorization", `Bearer ${token}`);
  }

  const response = await next();
  tokenHandle(response.headers());

  return response;
};

/**
 * 面向自研后端的请求类：
 * - token 未过期时带 `Authorization: Bearer <token>`（键名可用 `tokenName` 配置，见 `IKitRequestConfig`）
 * - 自动从响应头里刷新/清理 `localStorage` 的 token
 * - 数据转换：`transforms("limitFields:id,title")` 会拼成 `_transform` 查询参数，服务端 `Transform` 按白名单执行
 * - 分页与排序：`page()` / `order()` / `orders()`，对应后端 `RequestPagination` / `RequestSorting` 读的 query 参数
 * - 解包自研后端统一响应体 `{ statusCode, code, data, message, details, … }`：先校验结构，不符合就封装成这个结构
 * - 失败判定按这个格式来：非 2xx / 重定向 / 响应体 `statusCode` 非 2xx 都算失败
 * - **失败不抛错误对象**：直接把整个响应体作为 reject 值返回，调用方 catch 到的就是后端的原始响应体
 *
 * 因为请求头、响应体格式、失败判定、数据转换与分页 / 排序参数都是自研后端指定的，所以单独一层；
 * 对接其它系统后端时，基于 `Request` 派生、覆写 `unwrap` 即可。
 */
export default class KitRequest extends Request {
  constructor(config: IKitRequestConfig = {}) {
    const { transforms, tokenName: configTokenName, ...rest } = config;
    const middlewares = [...(rest.middlewares ?? [])];
    // 基于一份已有配置重新构造时（从别的实例派生），避免把鉴权中间件装两遍
    if (!middlewares.includes(authMiddleware)) {
      middlewares.push(authMiddleware);
    }
    super({ ...rest, middlewares });

    if (transforms?.length) {
      this.transforms(...transforms);
    }

    // `tokenName` 是模块级变量（见它的注释）：这里改的是全局键名，
    // 写下去之后所有请求都用新键名，包括更早构造的实例。
    if (tokenName) {
      tokenName = configTokenName;
    }
  }

  /**
   * 本次请求已带的转换指令。
   *
   * 按后端的切分规则读回来：带 `:` 的 token 开一条新指令，不带 `:` 的 token 属于上一条的参数
   * （所以 `limitFields:id,title` 算一条，不是两条）。
   */
  get requestTransforms(): string[] {
    const value = this.requestQuery["_transform"];
    if (!value) {
      return [];
    }
    return value.split(",").reduce<string[]>((result, token) => {
      if (result.length && !token.includes(":")) {
        result[result.length - 1] += `,${token}`;
      } else {
        result.push(token);
      }
      return result;
    }, []);
  }

  /**
   * 追加数据转换指令，拼成后端认的 `_transform` 查询参数。
   *
   * 每个元素写成 `名称` 或 `名称:参数`（多个参数继续用逗号），拼起来就是后端的 GET 字符串语法：
   * `transforms("limitFields:id,title", "withGroup:author_id")`
   * → `_transform=limitFields:id,title,withGroup:author_id`
   *
   * 注意：后端只认 `:` 作为指令边界，所以不带参数的指令写在后面会被当成上一条的额外参数，
   * 需要表达无参指令时让它单独出现最保险。
   *
   * 指令只是自研后端约定的一个查询参数（服务端 `Transform` 解析后按白名单执行），
   * 所以直接写进 query，不另存一份状态：这样它跟普通查询参数一样被快照进本次请求、
   * 一样被 `reset()` 清掉（转换只对本次请求生效），`Fetch` 也不必认识「转换」这个概念。
   * @param transforms 转换指令
   */
  transforms(...transforms: string[]): this {
    if (!transforms.length) {
      return this;
    }
    const current = this.requestQuery["_transform"];
    this.query("_transform", current ? `${current},${transforms.join(",")}` : transforms.join(","));
    return this;
  }

  /**
   * 设置分页参数。
   *
   * 这一层才有它：`page` / `perPage` 是自研后端约定的分页 query 参数
   * （后端 `RequestPagination` 读 `page` / `limit` / `perPage` / `skip`），
   * 不是通用 HTTP 的东西，所以不放在 `Request` 上。
   * @param page 页码，默认 1
   * @param perPage 每页条数，默认 10
   */
  page(page: number = 1, perPage: number = 10): this {
    this.query("page", page);
    this.query("perPage", perPage);
    return this;
  }

  /**
   * 设置单个排序字段。
   *
   * 对应后端 `RequestSorting` 读的两个参数：`order` 是字段名，`orderBy` 是方式（`ASC` / `DESC`）。
   * @param fieldName 字段名
   * @param sort 排序方式，默认 ASC
   */
  order(fieldName: string, sort: string = "ASC"): this {
    this.query("order", fieldName);
    this.query("orderBy", sort);
    return this;
  }

  /**
   * 批量设置排序规则，拼成后端认的 `orders` 参数（`字段:方式` 逗号分隔）。
   *
   * 没写方式的字段只发字段名，让后端去回退（先 `orderBy`、再 `ASC`）——
   * 「不指定方式」的语义由后端一处决定，前端不重复实现一遍。
   * @param rules 键为字段名，值为排序方式（空串表示不指定）
   */
  orders(rules: Record<string, string>): this {
    const orders: string[] = [];
    for (const key in rules) {
      const sort = rules[key];
      orders.push(sort && sort.trim() ? `${key}:${sort}` : key);
    }
    if (orders.length) {
      this.query("orders", orders.join(","));
    }
    return this;
  }

  /**
   * 校验响应体是不是自研后端的固定格式。
   *
   * 口径：对象 + 有数字型 `statusCode`，且特征字段（`code` / `data` / `message` / `details`）
   * 至少占一个 —— 满足就按这个协议解释，不满足就当「不是这个协议的响应」走封装。
   */
  #isKitBody(body: any): body is IKitResponseBody {
    return !!body
      && typeof body === "object"
      && typeof body.statusCode === "number"
      && ("code" in body || "data" in body || "message" in body || "details" in body);
  }

  /**
   * 拿到统一结构的响应体：先校验结构，不符合预期的就封装一下。
   *
   * 封装规则：把原始内容整个塞进 `data`，`statusCode` 取 HTTP 状态码 ——
   * 这样不管后端吐的是不是标准格式，`unwrap` 都只认一种结构，
   * 不必在每个分支里区分「协议响应」和「裸响应」（接口直接吐数组、响应不是 JSON 就是这类）。
   *
   * @template T `data` 的类型；判定成败用不到它，所以那里不传（默认 `null`）
   */
  #normalizeBody<T = null>(response: FetchResponse): IKitResponseBody<T> {
    const body = response.body() as any;
    if (this.#isKitBody(body)) {
      return body as IKitResponseBody<T>;
    }
    return {
      statusCode: response.statusCode(),
      code: response.statusCode(),
      data: body as T,
      message: null,
      details: null,
      requiredTime: null,
      version: null
    };
  }

  /**
   * 解包自研后端的统一响应体：先校验结构（不符合就封装成统一结构），再按成败分流。
   *
   * - 成功（HTTP 2xx 且响应体 `statusCode` 2xx 且未重定向）—— 返回 `data`
   * - 失败 —— **不包错误对象**，直接把整个响应体作为 reject 值交给调用者：
   *   `catch (body)` 拿到的就是后端的原始响应体（`statusCode` / `code` / `data` / `message` / `details` …），
   *   需要提示就拿 `body.message`，分支处理拿 `body.code`。
   *
   * 与基类的差异只在两点：失败判定多看一层响应体里的 `statusCode`（HTTP 200 但业务报错也拦），
   * 以及失败交出去的是**整个响应体**而不是裸 `data` —— 自研后端把失败原因写在 `message` / `details` 里，
   * 只给 `data`（失败时往往是 `[]`）等于把原因丢了。
   *
   * 后端固定格式里失败响应同样带 `data`（示例里是 `[]`），所以成败只看状态、不看有没有 `data`。
   * 标 `protected`：它是给子类覆写用的扩展点，不是对外 API
   * （对接别的后端时基于 `Request` 派生、覆写这里即可）。
   */
  protected unwrap<Result>(response: FetchResponse): Result {
    // 业务要的类型传给 `data`：这里是「响应体 -> 数据」唯一一处收口
    const body = this.#normalizeBody<Result>(response);

    const failed: boolean = this.isRedirected(response)
      || response.failed()
      || body.statusCode < 200
      || body.statusCode >= 300;

      console.log(body);
      
    if (failed) {
      // 直接把整个响应体作为 reject 值，不包错误对象
      throw body;
    }

    console.log(body);
    

    return body.data as Result;
  }
}
