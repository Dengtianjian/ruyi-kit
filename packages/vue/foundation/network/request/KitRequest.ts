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
  /**
   * 这个实例的 token 在 `localStorage` 里的键名，默认 `"token"`（过期时间存 `${tokenName}_expiresAt`）。
   *
   * 只影响当前实例：键名会随中间件一起进实例配置，不会改到其它实例。
   */
  tokenName?: string
}

/**
 * 一个实例用的 token 键名（`localStorage` 键名），由 `tokenName` 派生。
 *
 * 只对外暴露「改 tokenName」这一件事，两个键名的派生在 `createTokenKeys` 里一次做完 ——
 * 不会出现改了 token 键名、却漏掉过期时间键名（于是读到别的键下的过期时间，
 * 把有效 token 当成过期的而不带上）的情况。
 */
interface ITokenKeys {
  /** 配置的 tokenName，键名的来源 */
  name: string;
  /** token 在 `localStorage` 里的键名 */
  token: string;
  /** token 过期时间在 `localStorage` 里的键名 */
  expiresAt: string;
}

/**
 * 派生出一组键名：给了 `tokenName` 就是 `<tokenName>_token` / `<tokenName>_token_expiresAt`，
 * 不给就是 `token` / `token_expiresAt`。
 *
 * @param tokenName token 键名，默认 `"token"`
 */
function createTokenKeys(tokenName: string = null): ITokenKeys {
  return {
    name: tokenName,
    token: tokenName ? `${tokenName}_token` : 'token',
    expiresAt: tokenName ? `${tokenName}_token_expiresAt` : 'token_expiresAt'
  };
}

/**
 * 处理响应头里的鉴权信息（自研后端的约定：`X-Auth-Token` + `X-Auth-Token-Expires-At`）。
 *
 * 只有响应头里**两个头都在**才写回：绝大多数接口都不回鉴权头，
 * 「响应里没有 token」不等于「token 失效」，不能反过来把本地还有效的 token 清掉。
 * 有就写回，但只在 token 变了的时候写（过期时间跟着更新），
 * 避免每次请求都动一遍 `localStorage`。
 *
 * 清 token 是业务的事（登出时按 `tokenKey` / `tokenExpiresAtKey` 删），这里不做 ——
 * 库只认服务端明确回的东西。
 *
 * @param headers 响应头（键名已小写）
 * @param keys 这次请求所属实例的键名
 */
function tokenHandle(headers: Record<string, string>, keys: ITokenKeys): void {
  const token: string | undefined = headers['x-auth-token'];
  const tokenExpiresAt: string | undefined = headers['x-auth-token-expires-at'];

  if (!token || !tokenExpiresAt) {
    return;
  }

  if (localStorage.getItem(keys.token) !== token) {
    localStorage.setItem(keys.token, token);
    localStorage.setItem(keys.expiresAt, (Number(tokenExpiresAt) * 1000).toString());
  }
}

/**
 * 已发出的鉴权中间件（模块级，只用来「认人」）。
 *
 * 每个实例的中间件都是独立闭包（读自己的键名），所以基于别的实例的配置派生时，
 * 用它从 `middlewares` 里认出「别的实例那份」，替换成自己的，避免一次请求跑两遍鉴权。
 */
const authMiddlewares: WeakSet<TFetchMiddleware> = new WeakSet();

/**
 * 按一组键名生成自研后端的鉴权中间件（长期中间件，会被快照进每次请求的 Fetch 里）。
 *
 * 它只做两件事：请求前在 token 未过期时带上 `Authorization: Bearer <token>`；
 * 请求后把回执里的 `x-auth-token` / `x-auth-token-expires-at` 写回本地存储（两个头都在才写）。
 *
 * 键名在闭包里，所以每个实例各用各的（见 `createTokenKeys`）。
 *
 * 这里不做成功 / 失败判定，也**不因为没有这两个头就清理 token**：
 * 绝大多数接口都不回鉴权头，那是「这一响没带新 token」，不是「token 失效」。
 * 要改这个策略（比如「只在成功响应上刷新 token」、或「某几个 401 才清」），
 * 用 `use()` 在业务侧加一个自己的中间件，而不是往库里的判定里加分支。
 *
 * @param keys 这个实例用的键名
 */
function createAuthMiddleware(keys: ITokenKeys): TFetchMiddleware {
  const middleware: TFetchMiddleware = async (fetch, next) => {
    const token = localStorage.getItem(keys.token);
    const tokenExpiresAt = localStorage.getItem(keys.expiresAt);
    if (token && Number(tokenExpiresAt) > Date.now()) {
      fetch.header("Authorization", `Bearer ${token}`);
    }

    const response = await next();
    tokenHandle(response.headers(), keys);

    return response;
  };

  authMiddlewares.add(middleware);
  return middleware;
}

/**
 * 面向自研后端的请求类：
 * - token 未过期时带 `Authorization: Bearer <token>`（键名用 `tokenName` 配置，**每个实例各用各的**，见 `IKitRequestConfig`）
 * - 响应头带 `x-auth-token` / `x-auth-token-expires-at` 时才刷新 `localStorage` 里的 token（写的是本实例那两个键）
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
  /** 这个实例用的 token 键名；鉴权中间件闭包读的就是这一份 */
  #tokenKeys: ITokenKeys;

  constructor(config: IKitRequestConfig = {}) {
    const { transforms, tokenName, ...rest } = config;
    const keys: ITokenKeys = createTokenKeys(tokenName);

    // 从别的实例派生时，丢掉它那份鉴权中间件（闭包的是它的键名），换成自己的 ——
    // 两个都留着会一次请求刷两遍 token，且写的是两组不同的键
    const middlewares = (rest.middlewares ?? []).filter(middleware => !authMiddlewares.has(middleware));
    middlewares.push(createAuthMiddleware(keys));

    super({ ...rest, middlewares });

    this.#tokenKeys = keys;

    if (transforms?.length) {
      this.transforms(...transforms);
    }
  }

  /** 这个实例的 token 在 `localStorage` 里的键名（业务要手动清 token 时用得上） */
  get tokenKey(): string {
    return this.#tokenKeys.token;
  }

  /** 这个实例的 token 过期时间在 `localStorage` 里的键名 */
  get tokenExpiresAtKey(): string {
    return this.#tokenKeys.expiresAt;
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

    if (failed) {
      // 直接把整个响应体作为 reject 值，不包错误对象
      throw body;
    }

    console.log(body);


    return body.data as Result;
  }
}
