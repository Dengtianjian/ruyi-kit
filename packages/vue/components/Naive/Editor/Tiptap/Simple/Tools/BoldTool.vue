<template>
  <ToolbarButton tooltip-content="加粗" :active="editor.isActive('bold')"
    @click="editor.chain().focus().toggleBold().run()"><b>B</b></ToolbarButton>
</template>

<script setup>
import ToolbarButton from '../ToolbarButton.vue';
import { useToolbarEditor } from './context';

const editor = useToolbarEditor();
</script>
