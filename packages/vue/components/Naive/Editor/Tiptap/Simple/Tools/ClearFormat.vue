<template>
  <ToolbarButton tooltip-content="清除格式" @click="clearFormat">清除格式</ToolbarButton>
</template>

<script setup>
import ToolbarButton from '../ToolbarButton.vue';
import { useToolbarEditor } from './context';

const editor = useToolbarEditor();

function clearFormat() {
  editor.value.chain().focus().unsetAllMarks().clearNodes().run();
}
</script>
