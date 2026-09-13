import type { MenuOption } from "naive-ui";
import type { AnchorHTMLAttributes, HTMLAttributes, VNode, VNodeChild } from "vue";
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
export type TNaiveUIRouteMenuOption = {
  key: string,
  path: string,
  label: string | (() => VNode),
  index?: number,
  type?: TNaiveUIMenuTypes,
  show?: boolean,
  props?: HTMLAttributes,
  extra?: string | (() => VNodeChild),
  icon?: () => VNode,
  linkProps?: RouterLinkProps | AnchorHTMLAttributes,
  children?: TNaiveUIRouteMenuOption[],
  level?: number,
  disabled?: boolean,
  childrenKeys?: string[]
};

export interface INaiveUIMenuRouteMeta {
  naiveUIRouteMenu?: Partial<{
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
