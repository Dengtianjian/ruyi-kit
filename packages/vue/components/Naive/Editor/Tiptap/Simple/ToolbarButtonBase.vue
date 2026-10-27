<template>
  <n-button size="small" :secondary="active" :type="active ? 'primary' : 'default'" :style="[
    !active ? 'background-color:white' : ''
  ]" v-bind="$attrs">
    <slot />
  </n-button>
</template>

<script lang="ts" setup>
import { NButton } from "naive-ui";

/**
 * 工具栏按钮本体。
 *
 * 只做三件事：渲染 `n-button`、合并激活态 class、把 `$attrs`（`onClick` / `disabled` /
 * `size` …）透传下去。
 *
 * 必须关掉默认继承：否则 attrs 会「自动落一次 + `v-bind` 再落一次」，
 * `@click` 会被绑两遍、点一下触发两次。
 */
defineOptions({ inheritAttrs: false });

withDefaults(defineProps<{
  /** 是否处于激活态（光标在对应格式上），样式见下方 `.active` */
  active?: boolean
}>(), {
  active: false
});
</script>

<style scoped></style>
