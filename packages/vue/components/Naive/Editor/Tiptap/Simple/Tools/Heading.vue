<template>
  <ToolbarButton :tooltip-content="tooltipContent" :active="editor.isActive('heading', { level })"
    @click="editor.chain().focus().toggleHeading({ level }).run()">H{{ level }}</ToolbarButton>
</template>

<script setup>
import { computed } from 'vue';
import ToolbarButton from '../ToolbarButton.vue';
import { useToolbarEditor } from './context';

/**
 * 标题工具，1-6 级共用。
 *
 * 想放几级就在工具栏里实例化几次（Tiptap 的 heading 默认支持 1-6）：
 *
 * ```vue
 * <HeadingTool :level="1" />
 * <HeadingTool :level="2" />
 * ```
 */
const props = defineProps({
  /** 标题级别，1-6 */
  level: {
    type: Number,
    default: 1,
    validator: (value) => Number.isInteger(value) && value >= 1 && value <= 6
  }
});

const editor = useToolbarEditor();

/** 1-6 对应的中文数字，拼 tooltip 和按钮文案用 */
const levelTexts = ['一', '二', '三', '四', '五', '六'];

const tooltipContent = computed(() => `${levelTexts[props.level - 1] ?? props.level}级标题`);
</script>
