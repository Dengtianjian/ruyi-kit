import type { INaiveUIMenuRouteMeta, TNaiveUIRouteMenuOption } from "../../types/native/menu";
import type { TRouteRecordRaw } from "../../types/router";

/**
 * 菜单路由的 meta 约定：`INaiveUIMenuRouteMeta` 的菜单元信息 + 业务路由常用的 `title`。
 * 菜单文字优先 `meta.menu.label`，没有就退回 `meta.title`，再退回路由名 / path。
 */
type TMenuRouteMeta = INaiveUIMenuRouteMeta & {
  title?: string;
};

/**
 * 带菜单元信息的路由记录。
 * 业务侧用 `declare module` 或直接泛型把 `INaiveUIMenuRouteMeta` 挂到 `meta` 上，
 * `NaiveRouterMenu` 读的就是 `meta.menu`。
 */
type TMenuRouteRecord = TRouteRecordRaw<TMenuRouteMeta>;

/** 层级筛选条件：单个级别、多个级别，或者不传（不按级别筛） */
type TMenuLevelFilter = number | number[];

/**
 * 深度优先找 `name` 对应的路由（返回第一条命中；找不到返回 null）。
 * 名称按字符串比较：路由名允许是 number / symbol，这里统一 `toString()`。
 */
function findRouteByName(routes: TMenuRouteRecord[], name: string | number): TMenuRouteRecord {
  for (const route of routes) {
    if (route.name !== undefined && route.name !== null && route.name.toString() === name.toString()) {
      return route;
    }

    if (route.children) {
      const matched = findRouteByName(route.children as TMenuRouteRecord[], name);
      if (matched) return matched;
    }
  }

  return null;
}

/** 级别匹配：不传 `level` 就只要求「配了菜单元信息」；传了就要求级别对得上 */
function matchLevel(level: number, filter: TMenuLevelFilter): boolean {
  if (filter === undefined || filter === null) return true;
  if (Array.isArray(filter)) return level !== undefined && level !== null && filter.includes(level);
  return level === filter;
}

/**
 * 拼出绝对路径：父级路径 + 相对 path；本身就是绝对路径的原样返回。
 *
 * 子路由的 `path` 通常是相对的（`"environment"`），一旦被单独拎出来当菜单顶层，
 * 就没人再给它补父级前缀了 —— 链接会变成 `/environment` 而不是 `/system/environment`。
 */
function resolveRoutePath(parentPath: string, path: string): string {
  if (!path) return parentPath;
  if (path.startsWith("/")) return path;

  return [parentPath, path]
    .map(item => item?.trim())
    .filter(item => !!item)
    .join("/")
    .replace(/\/{2,}/g, "/");
}

/**
 * 从一棵「分组」节点里捞出指定级别的菜单路由。
 *
 * 规则：
 * - 没有 `meta.menu` 的路由只是分组容器，继续往下找；
 * - 级别不符的也继续往下找 —— 父级是 1 级、子级是 2 级时，`level = 2` 仍能取到子级；
 * - 级别匹配到就**收下并停止下钻**：它的子树由 `NaiveRouterMenu` 按 `children` 嵌套渲染，
 *   这里再单独挑出来会让同一项在菜单里出现两次；
 * - `includeChildren` 为 `false` 时，收下的路由会剥掉 `children`（连同整棵子树），
 *   结果里就只有筛选出来的这一层，适合「只要一层平铺菜单」的场景；
 * - 收下的路由会把相对 `path` 补成绝对路径（`parentPath` 一路带下来）：
 *   按 name 取出的子路由要当菜单顶层用，没人再给它补前缀了。
 */
function collectMenuRoutes(
  routes: TMenuRouteRecord[],
  level: TMenuLevelFilter,
  includeChildren: boolean,
  parentPath: string = ""
): TMenuRouteRecord[] {
  const MenuRoutes: TMenuRouteRecord[] = [];

  routes.forEach(route => {
    const Path: string = resolveRoutePath(parentPath, route.path);
    const MenuMeta = route.meta?.menu;

    if (!MenuMeta) {
      if (route.children) {
        MenuRoutes.push(...collectMenuRoutes(route.children as TMenuRouteRecord[], level, includeChildren, Path));
      }
      return;
    }

    if (matchLevel(MenuMeta.level, level)) {
      // 剥 children / 改 path 都用浅拷贝，别动业务传进来的路由表
      const MenuRoute: TMenuRouteRecord = Path === route.path ? route : { ...route, path: Path };
      MenuRoutes.push(includeChildren ? MenuRoute : { ...MenuRoute, children: undefined });
      return;
    }

    if (route.children) {
      MenuRoutes.push(...collectMenuRoutes(route.children as TMenuRouteRecord[], level, includeChildren, Path));
    }
  });

  return MenuRoutes;
}

/**
 * 按「父级名称 + 级别」从路由表里筛出 `NaiveRouterMenu` 的 `routes` 参数。
 *
 * 典型用法是同一份路由表喂给不同位置的两级菜单：
 *
 * ```ts
 * // 顶层菜单：整个路由表里级别为 1 的路由
 * const topRoutes = filterMenuRoutes(Routes, null, 1);
 * // 某个父级下面的二级菜单：先按 name 定位父级，再从它的 children 里挑级别 2 / 3
 * const subRoutes = filterMenuRoutes(Routes, "community", [2, 3]);
 * // 只要这一层的平铺菜单：把子级一起剥掉（菜单里不再出下一级）
 * const flatRoutes = filterMenuRoutes(Routes, null, 1, false);
 * ```
 *
 * @param routes          路由表，`meta` 按 `INaiveUIMenuRouteMeta` 的约定
 * @param name            父级路由的名称；不传则从整张表开始找
 * @param level           只要这些级别的路由；不传则不按级别筛（有菜单元信息就收）
 * @param includeChildren 是否保留筛选结果里的 `children`（默认 `true`）。
 *                        传 `false` 时收下的路由会剥掉整棵子树，`NaiveRouterMenu` 就不会再渲染下一级菜单
 * @returns 扁平的路由数组，直接传给 `<NaiveRouterMenu :routes="..." />`
 */
export function filterMenuRoutes(
  routes: TMenuRouteRecord[],
  name: string | number = null,
  level: TMenuLevelFilter = null,
  includeChildren: boolean = true
): TMenuRouteRecord[] {
  const Routes = routes ?? [];

  if (name !== null && name !== undefined && name !== "") {
    const Parent = findRouteByName(Routes, name);

    // 父级不存在时返回空菜单：宁可空着，也不要把整张路由表兜底甩出去
    if (!Parent) return [];

    return collectMenuRoutes((Parent.children ?? []) as TMenuRouteRecord[], level, includeChildren, Parent.path);
  }

  return collectMenuRoutes(Routes, level, includeChildren);
}

/** 收集一棵菜单项子树里的全部 key（父项据此知道哪些 key 在自己的子树内） */
function collectChildrenKeys(options: TNaiveUIRouteMenuOption[]): string[] {
  const Keys: string[] = [];

  options.forEach(option => {
    Keys.push(option.key);

    if (option.children) {
      Keys.push(...collectChildrenKeys(option.children as TNaiveUIRouteMenuOption[]));
    }
  });

  return Keys;
}

/**
 * 把路由表转成 `NaiveRouterMenu` 的 `menus` 参数（`TNaiveUIRouteMenuOption[]`）。
 *
 * 和 `routes` 参数走同一套规则：
 * - 没有 `meta.menu` 的路由只是分组容器：子路由被**摊平**到当前层，相对路径按容器补齐；
 * - `key` 取路由名，没有名称就退回 `path`；
 * - 菜单文字优先 `meta.menu.label`，其次 `meta.title`，最后退回名称 / path；
 * - `index` / `level` / `show` / `disabled` / `extra` / `icon` / `type` 原样带过来，
 *   `type` 为 `divider` 时把路由的 `props` 当作分隔线的属性；
 * - 子路由递归成 `children`，并顺手算好 `childrenKeys`。
 *
 * 只做「路由 → 菜单项」这一步：排序、把 label 包成链接由 `NaiveRouterMenu` 继续处理。
 *
 * @param routes 路由表，`meta` 按 `INaiveUIMenuRouteMeta` 的约定
 * @param parent 父级菜单项，只用于补齐相对路径（递归时内部传入）
 */
export function routesToMenuOptions(
  routes: TMenuRouteRecord[],
  parent: TNaiveUIRouteMenuOption = null
): TNaiveUIRouteMenuOption[] {
  const MenuOptions: TNaiveUIRouteMenuOption[] = [];

  (routes ?? []).forEach(routeItem => {
    const RouteMenuConfig = routeItem.meta?.menu;

    // 没有菜单元信息 = 纯分组节点：把子路由摊平到当前层，相对路径按本节点补齐
    if (!RouteMenuConfig) {
      if (routeItem.children) {
        MenuOptions.push(...routesToMenuOptions(routeItem.children as TMenuRouteRecord[], {
          key: routeItem.name?.toString() || routeItem.path,
          path: routeItem.path,
          label: routeItem.name?.toString() || routeItem.path
        }));
      }
      return;
    }

    let path: string = routeItem.path;
    if (!path.startsWith("/") && parent?.path) {
      path = [parent.path, path].map(item => item.trim()).filter(item => item).join("/");
    }

    const Option: TNaiveUIRouteMenuOption = {
      key: routeItem.name?.toString() || routeItem.path,
      path,
      // 菜单元信息里的 label 可以是 VNodeChild，菜单项只收 VNode：渲染方式交给上层决定，这里按菜单项的类型收敛。
      // 用 `||` 而不是 `??`：空字符串也算「没给文字」，继续往下一级退
      label: (RouteMenuConfig.label || routeItem.meta?.title || routeItem.name?.toString() || routeItem.path) as TNaiveUIRouteMenuOption["label"]
    };

    if (RouteMenuConfig.index !== undefined) {
      Option['index'] = RouteMenuConfig.index;
    }
    if (RouteMenuConfig.level !== undefined) {
      Option['level'] = RouteMenuConfig.level;
    }
    if (RouteMenuConfig.show !== undefined) {
      Option['show'] = RouteMenuConfig.show;
    }
    if (RouteMenuConfig.disabled !== undefined) {
      Option['disabled'] = RouteMenuConfig.disabled;
    }
    if (RouteMenuConfig.extra !== undefined) {
      Option['extra'] = RouteMenuConfig.extra;
    }
    if (RouteMenuConfig.icon !== undefined) {
      Option['icon'] = RouteMenuConfig.icon;
    }

    if (RouteMenuConfig.type) {
      Option.type = RouteMenuConfig.type;

      switch (RouteMenuConfig.type) {
        case "divider":
          Option.props = (routeItem.props as TNaiveUIRouteMenuOption["props"]) ?? undefined;
          break;
      }
    }
    if (routeItem.children) {
      Option.children = routesToMenuOptions(routeItem.children as TMenuRouteRecord[], Option);
      Option.childrenKeys = collectChildrenKeys(Option.children);
    }

    MenuOptions.push(Option);
  });

  return MenuOptions;
}

export default {
  filterMenuRoutes,
  routesToMenuOptions
};
