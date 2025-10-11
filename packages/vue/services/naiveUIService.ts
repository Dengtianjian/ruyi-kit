import { h } from "vue"
import { RouterLink } from "vue-router"
import type { RouterLinkProps } from "vue-router";
import type { VNodeProps, ComponentCustomProps, AllowedComponentProps } from "vue";

function createdRouterLinkLabel(labelText: string, routerLinkOptions: AllowedComponentProps & ComponentCustomProps & VNodeProps & RouterLinkProps) {
  return () =>
    h(
      RouterLink,
      {
        ...routerLinkOptions
      },
      { default: () => labelText }
    )
}

export default {
  createdRouterLinkLabel
}