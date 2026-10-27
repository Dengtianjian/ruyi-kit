<template>
  <div class="simple-editor-toolbar">
    <slot />
  </div>
</template>

<script setup>
import { computed, provide } from 'vue';
import { toolbarEditorKey } from './Tools/context';

const props = defineProps({
  /** 编辑器实例，由父组件持有（`v-if="editor"` 保证非空） */
  editor: { type: Object, required: true }
})

// 包一层 computed，模板里直接用 `editor.xxx`，不依赖 props 解构的响应式编译选项
const editor = computed(() => props.editor)

// 工具组件统一从这里取实例（见 Tools/context.ts），不必逐个传 prop
provide(toolbarEditorKey, editor)
</script>

<style scoped>
.simple-editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}
</style>
