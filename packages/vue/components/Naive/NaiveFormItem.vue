<template>
  <n-form-item v-bind="$attrs">
    <template #feedback v-if="$slots.feedback">
      <slot name="feedback" />
    </template>
    <template #label v-if="$slots.label">
      <slot name="label" />
    </template>
    <div :style="`${block ? 'flex:1' : ''};`">
      <slot />
      <div class="form-item-bottom" v-if="$slots.bottom">
        <slot name="bottom" />
      </div>
      <div class="prompt" v-if="prompt || $slots.prompt">
        <slot name="prompt" />
        <div class="prompt">
          {{ prompt }}
        </div>
      </div>
    </div>
  </n-form-item>
</template>

<script lang="ts" setup>
import { NFormItem } from 'naive-ui';

withDefaults(defineProps<{
  prompt?: string,
  block?: boolean
}>(), {
  prompt: null,
  block: false
})
</script>

<style scoped>
.form-item-bottom {
  margin-top: 5px;
}

.prompt {
  margin-top: 10px;
  font-size: 12px;
  color: var(--n-feedback-text-color);
}
</style>