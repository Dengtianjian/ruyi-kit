<template>
  <n-menu :options="menuOptions" v-model:value="DefaultSelectedMenu" v-bind="$attrs" @update-value="menuValueUpdate" />
</template>

<script lang="ts" setup>
import { MenuOption, NMenu } from 'naive-ui';
import { AllowedComponentProps, ComponentCustomProps, computed, ComputedRef, PropType, Ref, ref, RendererElement, RendererNode, VNode, VNodeChild, VNodeProps } from 'vue';
import { useRouter, useRoute, RouterLinkProps } from 'vue-router';
import helper from '../../foundation/helper';
import naiveUI from '../../foundation/naiveUI';

declare module 'vue-router' {
  interface RouteMeta {
    menu?: {
      index?: number,
      disabled?: boolean,
      extra?: string | (() => VNodeChild),
      icon?: () => VNode,
      label?: string | (() => VNodeChild),
      show?: boolean,
      type?: "group" | "list",
      level?: number
    }
  }
}

const Props = withDefaults(defineProps<{
  options: Array<{
    link?: string | AllowedComponentProps & ComponentCustomProps & VNodeProps & RouterLinkProps,
    label?: string | (() => VNode<RendererNode, RendererElement, { [key: string]: any; }>) | AllowedComponentProps & ComponentCustomProps & VNodeProps & RouterLinkProps,
    key: string,
    childrenNames?: string[]
  }>
}>(), {

});

const Router = useRouter();
const Route = useRoute();

let selectedMenu: MenuOption & {
  childrenNames?: string[]
} = null;
const DefaultSelectedMenu = ref<string>(Route.name.toString());

Router.beforeResolve((to, from, next) => {
  DefaultSelectedMenu.value = to.name?.toString();
  if (selectedMenu?.childrenNames && selectedMenu.childrenNames.includes(to.name.toString())) {
    DefaultSelectedMenu.value = selectedMenu.key.toString();
  }
  next();
});

Props.options.forEach(item => {
  if (item.childrenNames && item.childrenNames.includes(Route.name.toString())) {
    selectedMenu = item;
    DefaultSelectedMenu.value = item.key;
  }
})

const menuOptions: ComputedRef<MenuOption[]> = computed(() => {
  return Props.options.map(optionItem => {
    if (helper.type(optionItem.link) === "string") {
      return {
        label: typeof optionItem.label === "string" ? naiveUI.createdRouterLinkLabel(optionItem.label, {
          to: optionItem.link
        }) : optionItem.label,
        key: optionItem.key
      }
    } else {
      return optionItem;
    }
  });
});

function menuValueUpdate(key, item) {
  selectedMenu = item;
}
</script>

<style scoped></style>