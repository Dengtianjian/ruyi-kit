<template>
  <ToolbarButton tooltip-content="二级标题" :active="editor.isActive('heading', { level: 2 })"
    @click="editor.chain().focus().toggleHeading({ level: 2 }).run()">H2</ToolbarButton>
</template>

<script setup>
import ToolbarButton from '../ToolbarButton.vue';
import { useToolbarEditor } from './context';

const editor = useToolbarEditor();
</script>
