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


