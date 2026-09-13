import { h, type AllowedComponentProps, type ComponentCustomProps, type VNodeProps } from "vue"
import { RouterLink, type RouterLinkProps } from "vue-router"

function createdRouterLinkLabel(labelText: string, routerLinkOptions: AllowedComponentProps & ComponentCustomProps & VNodeProps & RouterLinkProps) {
  return () =>
    h(
      RouterLink,
      // RouterLink 的组件类型无法直接满足 h() 的重载推导，这里收敛为普通 props 对象
      { ...routerLinkOptions } as any,
      { default: () => labelText }
    )
}

export default {
  createdRouterLinkLabel
}