import type { RouteRecordName } from "vue-router";
import NaiveUI from "../foundation/naiveUI";
import type { RTMenuOption } from "../types/components/Common";
import type { TRuyiRouteRecordRaw } from "../types/declare/vue-router";
import type { VNode, VNodeChild } from "vue";

export type TRuyiRouteMetaNaiveUIMenu<T extends Object = {}> = {
  index?: number,
  disabled?: boolean,
  extra?: string | (() => VNodeChild),
  icon?: () => VNode,
  title?: string,
  label?: string | (() => VNodeChild),
  show?: boolean,
  type?: "group" | 'list',
  level?: number
} & T;

function getChildrenRouteNames(Routes: TRuyiRouteRecordRaw[]): string[] {
  const Names: string[] = [];

  Routes.forEach(RouteItem => {
    Names.push(RouteItem.name.toString());
    if (RouteItem.children) {
      Names.push(...getChildrenRouteNames(RouteItem.children));
    }
  })

  return Names;
}
function getRoute(Routes: TRuyiRouteRecordRaw[], name: RouteRecordName): TRuyiRouteRecordRaw[] {
  let routes: TRuyiRouteRecordRaw[] = [];

  for (let index = 0; index < Routes.length; index++) {
    const Route = Routes[index];
    if (Route.name === name) {
      routes = Route.children;
      break;
    }
    if (Route.children) {
      routes = getRoute(Route.children, name);
    }
  }

  return routes;
}
export function generateRouterMenuOptions<RouteMeta extends Object = {
  title?: string
}>(Routes: TRuyiRouteRecordRaw<RouteMeta>[], level: number | number[] | boolean = false, RouteName: string = null): Array<RTMenuOption<RouteMeta>> {
  if (RouteName) {
    Routes = getRoute(Routes, RouteName) as TRuyiRouteRecordRaw<RouteMeta>[];
    if (!Routes) return [];
  }

  const MenuRoutes: Array<RTMenuOption<RouteMeta>> = [];
  Routes.forEach(RouteItem => {
    // 菜单元信息统一写在 meta.naiveUIRouteMenu（兼容历史的 meta.menu）；
    // vue-router 的 RouteMeta 带有索引签名，这里收敛成 kit 约定的菜单元信息类型
    const MenuMeta = (RouteItem.meta?.naiveUIRouteMenu ?? RouteItem.meta?.menu) as TRuyiRouteMetaNaiveUIMenu | undefined;
    const RouteMenu: TRuyiRouteMetaNaiveUIMenu = MenuMeta ?? {};

    if (level === false || level && RouteMenu.level) {
      if (level === false || (Array.isArray(level) && level.includes(RouteMenu.level)) || level === RouteMenu.level) {
        if (MenuMeta) {
          const Options: RTMenuOption<RouteMeta> = {
            key: RouteItem.name.toString(),
            childrenNames: getChildrenRouteNames(RouteItem.children ?? []),
            index: RouteMenu.index ?? MenuRoutes.length + 1,
            meta: RouteItem.meta
          }

          if (RouteMenu.disabled !== undefined) {
            Options['disabled'] = RouteMenu.disabled;
          }
          if (RouteMenu.show !== undefined) {
            Options['show'] = RouteMenu.show;
          }
          if (RouteMenu.extra !== undefined) {
            Options['extra'] = RouteMenu.extra;
          }
          if (RouteMenu.icon !== undefined) {
            Options['icon'] = RouteMenu.icon;
          }
          if (RouteMenu.type) {
            Options['label'] = RouteMenu.label?.toString() ?? RouteItem.meta.title;
            if (RouteMenu.type === "group") {
              Options['type'] = RouteMenu.type;
              if (RouteItem.children) {
                Options['children'] = generateRouterMenuOptions<RouteMeta>(RouteItem.children);
              } else {
                Options['children'] = [];
              }
            } else if (RouteMenu.type === "list") {
              if (RouteItem.children) {
                Options['children'] = generateRouterMenuOptions<RouteMeta>(RouteItem.children);
              }
            }
          } else {
            // @ts-ignore
            Options['label'] = NaiveUI.createdRouterLinkLabel(RouteMenu.label?.toString() ?? RouteItem.meta.title, {
              to: {
                name: RouteItem.name
              }
            });
          }
          if (RouteMenu.level !== undefined) {
            Options['level'] = RouteMenu.level;
          }

          MenuRoutes.push(Options);
        }
      }
    }
    if (RouteItem.children && !RouteMenu.type) {
      MenuRoutes.push(...generateRouterMenuOptions<RouteMeta>(RouteItem.children, level));
    }
  });
  MenuRoutes.sort((a, b) => {
    return a.index - b.index;
  });
  return MenuRoutes;
}
