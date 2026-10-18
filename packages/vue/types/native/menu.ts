import type { MenuOption } from "naive-ui";
import type { AllowedComponentProps, AnchorHTMLAttributes, ComponentCustomProps, HTMLAttributes, RendererElement, RendererNode, VNode, VNodeChild, VNodeProps } from "vue";
import type { RouterLinkProps } from "vue-router";

export type TNaiveUIMenuTypes = "group" | "divider" | "list";

export type TNaiveUIMenuOption = MenuOption & {
  meta: {
    key: string,
    path: string,
    index: number,
    level?: number,
    linkProps?: RouterLinkProps | AnchorHTMLAttributes,
    childrenKeys?: string[]
  }
};
export type TNaiveUIRouteMenuOption<Meta = {}> = {
  key: string,
  label: string | (() => VNode<RendererNode, RendererElement, { [key: string]: any; }>) | AllowedComponentProps & ComponentCustomProps & VNodeProps & RouterLinkProps,

  path?: string,
  index?: number,
  link?: string | AllowedComponentProps & ComponentCustomProps & VNodeProps & RouterLinkProps,
  type?: TNaiveUIMenuTypes,
  show?: boolean,
  props?: HTMLAttributes,
  extra?: string | (() => VNodeChild),
  icon?: () => VNode,
  linkProps?: RouterLinkProps | AnchorHTMLAttributes,
  children?: TNaiveUIRouteMenuOption[],
  level?: number,
  disabled?: boolean,
  childrenKeys?: string[],
  meta?: Meta
};

/**
 * 菜单路由的筛选条件（`NaiveRouterMenu` 的 `filter` 参数），三项都可选。
 * 对应 `filterMenuRoutes(routes, name, level, includeChildren)` 的后面三个参数。
 */
export interface INaiveUIMenuRouteFilter {
  /** 父级路由的名称：只取该父级下面的路由；不传则用整张路由表 */
  name?: string | number,
  /** 只保留 `meta.menu.level` 命中这些值的路由；不传则不按级别筛 */
  level?: number | number[],
  /** 结果是否保留 `children`：默认 `true`；传 `false` 只留当前这一层，菜单里不再出下一级 */
  includeChildren?: boolean
}

export interface INaiveUIMenuRouteMeta {
  menu?: Partial<{
    show: boolean,
    disabled: boolean,
    type: TNaiveUIMenuTypes,
    index: number,
    level: number,
    label: string | (() => VNodeChild),
    linkProps: RouterLinkProps,
    extra: string | (() => VNodeChild),
    icon: () => VNode
  }>
};


