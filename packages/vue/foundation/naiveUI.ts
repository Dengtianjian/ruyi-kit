import { AllowedComponentProps, ComponentCustomProps, h, VNodeProps } from "vue"
import { RouterLink, RouterLinkProps } from "vue-router"

function createdRouterLinkLabel(labelText: string, routerLinkOptions: AllowedComponentProps & ComponentCustomProps & VNodeProps & RouterLinkProps) {
  return () =>
    h(
      RouterLink,
      routerLinkOptions,
      { default: () => labelText }
    )
}

export default {
  createdRouterLinkLabel
}