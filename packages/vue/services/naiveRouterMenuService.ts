import { RouteRecordName } from "vue-router";
import NaiveUI from "../foundation/naiveUI";
import { RTMenuOption } from "../types/components/Common";
import { TRuyiRouteRecordRaw } from "../types/declare/vue-router";
import { VNodeChild } from "vue";

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
    if (level === false || level && RouteItem.meta?.menu?.level) {
      if (level === false || (Array.isArray(level) && level.includes(RouteItem.meta.menu.level)) || level === RouteItem.meta.menu.level) {
        if (RouteItem.meta?.menu) {
          const Options = {
            key: RouteItem.name.toString(),
            childrenNames: getChildrenRouteNames(RouteItem.children ?? []),
            index: RouteItem.meta.menu?.index ?? MenuRoutes.length + 1,
            meta: RouteItem.meta
          }

          if (RouteItem.meta.menu.disabled !== undefined) {
            Options['disabled'] = RouteItem.meta.menu.disabled;
          }
          if (RouteItem.meta.menu.show !== undefined) {
            Options['show'] = RouteItem.meta.menu.show;
          }
          if (RouteItem.meta.menu.extra !== undefined) {
            Options['extra'] = RouteItem.meta.menu.extra;
          }
          if (RouteItem.meta.menu.icon !== undefined) {
            Options['icon'] = RouteItem.meta.menu.icon;
          }
          if (RouteItem.meta.menu.type) {
            Options['label'] = RouteItem.meta.menu.label?.toString() ?? RouteItem.meta.title;
            if (RouteItem.meta.menu.type === "group") {
              Options['type'] = RouteItem.meta.menu.type;
              if (RouteItem.children) {
                Options['children'] = generateRouterMenuOptions(RouteItem.children);
              } else {
                Options['children'] = [];
              }
            } else if (RouteItem.meta.menu.type === "list") {
              if (RouteItem.children) {
                Options['children'] = generateRouterMenuOptions(RouteItem.children);
              }
            }
          } else {
            // @ts-ignore
            Options['label'] = NaiveUI.createdRouterLinkLabel(RouteItem.meta.menu.label?.toString() ?? RouteItem.meta.title, {
              to: {
                name: RouteItem.name
              }
            });
          }
          if (RouteItem.meta.menu.level !== undefined) {
            Options['level'] = RouteItem.meta.menu.level;
          }

          MenuRoutes.push(Options);
        }
      }
    }
    if (RouteItem.children && !RouteItem.meta?.menu?.type) {
      MenuRoutes.push(...generateRouterMenuOptions(RouteItem.children, level));
    }
  });
  MenuRoutes.sort((a, b) => {
    return a.index - b.index;
  });
  return MenuRoutes;
}