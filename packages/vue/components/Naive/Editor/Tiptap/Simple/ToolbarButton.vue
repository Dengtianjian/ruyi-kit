<template>
  <n-tooltip v-if="hasTooltip" v-bind="tooltipProps">
    <template #trigger>
      <slot name="button" :active="active" :attrs="$attrs">
        <ToolbarButtonBase :active="active" v-bind="$attrs">
          <slot />
        </ToolbarButtonBase>
      </slot>
    </template>
    <slot name="tooltipContent">{{ tooltipContent }}</slot>
  </n-tooltip>
  <slot v-else name="button" :active="active" :attrs="$attrs">
    <ToolbarButtonBase :active="active" v-bind="$attrs">
      <slot />
    </ToolbarButtonBase>
  </slot>
</template>

<script lang="ts" setup>
import { computed, useSlots } from "vue";
import { NTooltip } from "naive-ui";
import ToolbarButtonBase from "./ToolbarButtonBase.vue";

// 根节点有两个（tooltip / 直接渲染按钮），多根组件不会自动继承 attrs，
// 关掉继承、统一用 `v-bind="$attrs"` 往下传，否则还会有
// "Extraneous non-emits event listeners" 警告
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<{
  /** 气泡提示文案；不传就是普通按钮 */
  tooltipContent?: string,
  /** 是否允许气泡提示，默认允许 */
  showTooltip?: boolean,
  /** 透传给 `n-tooltip` 的参数 */
  tooltipProps?: Record<string, any>,
  /** 是否处于激活态，会透给按钮本体（或用 `#button` 插槽时作用域里的 `active`） */
  active?: boolean
}>(), {
  showTooltip: true,
  active: false,
  // 对象 / 数组默认值必须用工厂函数，否则所有实例共享同一个对象
  tooltipProps: () => ({ trigger: "hover" })
});

const slots = useSlots();

/** 有文案（或 tooltipContent 插槽）且没被关掉时才走 tooltip 分支 */
const hasTooltip = computed(() => (
  props.showTooltip && (!!props.tooltipContent || !!slots.tooltipContent)
));
</script>

<style scoped></style>
