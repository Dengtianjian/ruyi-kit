import { h } from "vue"
import { RouterLink } from "vue-router"
import type { RouterLinkProps } from "vue-router";
import type { VNodeProps, ComponentCustomProps, AllowedComponentProps } from "vue";

function createdRouterLinkLabel(labelText: string, routerLinkOptions: AllowedComponentProps & ComponentCustomProps & VNodeProps & RouterLinkProps) {
  return () =>
    h(
      RouterLink,
      // RouterLink 的组件类型无法直接满足 h() 的重载推导，这里收敛为普通 props 对象
      {
        ...routerLinkOptions
      } as any,
      { default: () => labelText }
    )
}

export default {
  createdRouterLinkLabel
}