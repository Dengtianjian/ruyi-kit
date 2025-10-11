<template>
  <n-menu :options="menuOptions" v-model:value="DefaultSelectedMenu" v-bind="$attrs"
    :default-expanded-keys="ExpandedKeys" />
</template>

<script lang="ts" setup>
import { computed, PropType, ref } from 'vue';
import { useRouter, useRoute, RouteLocationNormalizedLoaded } from 'vue-router';
import helper from '../../foundation/helper';
import naiveUIService from '../../services/naiveUIService';
import { RTMenuOption } from '../../types/components/Common';

const Props = defineProps({
  options: {
    type: Array as PropType<Array<RTMenuOption>>
  },
});

const Router = useRouter();
const Route = useRoute();

const ExpandedKeys = ref<string[]>([]);

const DefaultSelectedMenu = ref<string>(Route.name.toString());
Router.beforeResolve((to, from, next) => {
  getActiveMenuName(menuOptions.value, to);
  next();
});

function getActiveMenuName(menuOptions: RTMenuOption[], CurrentRoute: RouteLocationNormalizedLoaded = Route) {
  let hitMenu = null;
  for (const item of menuOptions) {
    if (item.type && item.type === 'group') continue;

    if (item.childrenNames && item.childrenNames.includes(CurrentRoute.name.toString())) {
      hitMenu = item;
    }
  }

  ExpandedKeys.value = [];
  if (hitMenu) {
    ExpandedKeys.value.push(hitMenu.key);
  }
  DefaultSelectedMenu.value = hitMenu ? hitMenu.key.toString() : CurrentRoute.name.toString();
}

function transform(menus: RTMenuOption[]): RTMenuOption[] {
  return menus.map(optionItem => {
    if (optionItem.type === "group" && optionItem.children) {
      optionItem.children = transform(optionItem.children);
      return optionItem;
    }
    if (helper.type(optionItem.link) === "string") {
      return {
        label: typeof optionItem.label === "string" ? naiveUIService.createdRouterLinkLabel(optionItem.label, {
          to: optionItem.link
        }) : optionItem.label,
        key: optionItem.key
      } as RTMenuOption;
    } else {
      return optionItem;
    }
  });
}

const menuOptions = computed<RTMenuOption[]>(() => {
  return transform(Props.options);
});
getActiveMenuName(menuOptions.value);
</script>

<style scoped></style>