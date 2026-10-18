<template>
  <n-layout has-sider style="background-color:transparent;">
    <n-layout-sider :width="siderWidth" style="min-height:calc(100vh - 60px);">
      <NaiveRouterMenu :menus="options" :routes="routes" :filter="routeFilter"></NaiveRouterMenu>
    </n-layout-sider>
    <n-layout-content style="background-color:transparent;">
      <Panel :style="{
        margin: '20px auto',
        width: contentWidth
      }" v-if="!$slots.default">
        <KeepAliveRouterView />
      </Panel>
      <slot />
    </n-layout-content>
  </n-layout>
</template>

<script lang="ts" setup>
import { NLayout, NLayoutSider, NLayoutContent } from 'naive-ui';
import NaiveRouterMenu from '../NaiveRouterMenu.vue';
import Panel from '../../Base/Panel.vue';
import KeepAliveRouterView from '../../Base/KeepAliveRouterView.vue';
import { INaiveUIMenuRouteFilter, TNaiveUIRouteMenuOption } from '../../../types/native/menu.js';
import { TRouteRecordRaw } from '../../../types/router.js';

const props = withDefaults(defineProps<{
  options?: Array<TNaiveUIRouteMenuOption>,
  routes?: Array<TRouteRecordRaw>,
  routeFilter?: INaiveUIMenuRouteFilter,
  siderWidth?: string | number,
  contentWidth?: string | number
}>(), {
  siderWidth: 272,
  contentWidth: 'auto'
});
</script>

<style scoped></style>