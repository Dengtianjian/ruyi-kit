<template>
  <ToolbarButton tooltip-content="取消链接" :disabled="!editor.isActive('link')" @click="unsetLink">取消链接</ToolbarButton>
</template>

<script setup>
import ToolbarButton from '../ToolbarButton.vue';
import { useToolbarEditor } from './context';

const editor = useToolbarEditor();

function unsetLink() {
  editor.value.chain().focus().extendMarkRange('link').unsetLink().run();
}
</script>
