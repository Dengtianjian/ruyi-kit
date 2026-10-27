<template>
  <ToolbarButton tooltip-content="三级标题" :active="editor.isActive('heading', { level: 3 })"
    @click="editor.chain().focus().toggleHeading({ level: 3 }).run()">H3</ToolbarButton>
</template>

<script setup>
import ToolbarButton from '../ToolbarButton.vue';
import { useToolbarEditor } from './context';

const editor = useToolbarEditor();
</script>
