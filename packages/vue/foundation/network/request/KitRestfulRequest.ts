import KitRequest from "./KitRequest";
import type { IPageResponse } from "../../../types/request";

/**
 * 资源型接口的公共基类：一套「列表 / 分页 / 单条 / 新增 / 修改 / 删除」。
 *
 * 方法名刻意避开底层 HTTP 动词（`get` / `post` / `patch` / `delete`）：
 * 子类里若声明同名方法，会把 `KitRequest` 的请求能力遮住，`this.get(...)` 的语义随之混乱。
 *
 * - `items()`  全量列表，返回数组
 * - `list()`   分页列表，返回 `IPageResponse<T[]>`（`data` + `pagination`）
 * - `item()`   单条
 * - `create()` / `update()` / `remove()` 增 / 改 / 删
 *
 * 全量与分页必须分名：都叫 `list` 时，调用方从方法名看不出拿到的是数组还是分页对象。
 *
 * 失败口径与 `KitRequest` 一致：非 2xx / 重定向 / 响应体 `statusCode` 非 2xx 都走 reject，
 * 且 reject 值就是整个响应体（不包错误对象），`catch (body)` 直接取 `body.message` / `body.code`。
 *
 * ```ts
 * class DemosApi extends KitRestfulRequest {
 *   // 有额外接口时才需要写方法，增删改查直接用父类的
 * }
 * export default new DemosApi({ prefix: "demos", baseUrl: "...", tokenName: "demo" });
 * ```
 */
export default class KitRestfulRequest extends KitRequest {
  /** 全量列表（不分页），返回数组 */
  items<Item = any>(query: Record<string, number | string> = null) {
    return this.get<Item[]>(null, query);
  }

  /**
   * 分页列表。
   *
   * 分页参数走 `KitRequest.page()` 拼的 `page` / `perPage`（后端 `RequestPagination` 读的那两个），
   * 其余筛选条件用 `query` 追加；返回体是自研后端的 `IPageResponse`，`data` 里才是列表。
   *
   * @param page 页码，默认 1
   * @param perPage 每页条数，默认 10
   * @param query 额外筛选条件
   */
  list<Item = any>(page: number = 1, perPage: number = 10, query: Record<string, number | string | boolean> = null) {
    this.page(page, perPage);

    if (query) {
      this.queries(query);
    }

    return this.get<IPageResponse<Item[]>>();
  }

  /** 单条 */
  item<Item = any>(id: number | string) {
    return this.get<Item>(id.toString());
  }

  /** 新增，返回新记录的 id（自研后端这边的约定） */
  create<CreateData = any>(data: CreateData) {
    return this.post<number>(null, data);
  }

  /** 修改 */
  update<UpdateData = any>(id: number | string, data: UpdateData) {
    return this.patch(id.toString(), data);
  }

  /** 删除 */
  remove(id: number | string) {
    return this.delete(id.toString());
  }
}

/** `KitRestfulRequest` 提供的那套方法（只描述行为，不带实现，给 `Restful()` 拼类型用） */
export type TKitRestfulMethods = Pick<KitRestfulRequest, "items" | "list" | "item" | "create" | "update" | "remove">;

/**
 * 可选地把 restful 方法装到某个请求类上，得到一个「带增删改查」的派生类。
 *
 * 为什么要这么一个函数：`DiscuzXRequest` 的子类里，有些业务类需要一套通用增删改查，
 * 有些完全用不到。为了不让它们各自派生一个基类（类数量翻倍），改成在声明处按需包一层：
 *
 * ```ts
 * class DemosApi extends Restful(DiscuzXCommunityRequest) {}   // 要增删改查
 * class SettingsApi extends DiscuzXCommunityRequest {}         // 不要，一个方法都不多
 * ```
 *
 * 方法实现直接取自 `KitRestfulRequest.prototype`（拷贝描述符，不复制方法体），
 * 所以这套逻辑始终只有一份，`KitRestfulRequest` 那边改了这里自动跟上。
 *
 * 已知取舍：mixin 的构造函数参数类型会退化成 `any[]`（`new DemosApi("demos")` 仍能写，
 * 但参数不再做类型检查）；在意参数类型就用实例级安装，或用 `KitRestfulRequest` 直接继承。
 *
 * @param Base 要包装的请求类
 */
export function Restful<TBase extends new (...args: any[]) => KitRequest>(Base: TBase) {
  class RestfulRequest extends Base {}

  Object.getOwnPropertyNames(KitRestfulRequest.prototype).forEach((name: string) => {
    if (name === "constructor") return;

    const descriptor: PropertyDescriptor = Object.getOwnPropertyDescriptor(KitRestfulRequest.prototype, name);
    if (descriptor) {
      Object.defineProperty(RestfulRequest.prototype, name, descriptor);
    }
  });

  return RestfulRequest as TBase & (new (...args: any[]) => TKitRestfulMethods);
}
