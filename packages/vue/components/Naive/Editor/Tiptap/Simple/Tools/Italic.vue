<template>
  <ToolbarButton tooltip-content="斜体" :active="editor.isActive('italic')"
    @click="editor.chain().focus().toggleItalic().run()"><i>I</i></ToolbarButton>
</template>

<script setup>
import ToolbarButton from '../ToolbarButton.vue';
import { useToolbarEditor } from './context';

const editor = useToolbarEditor();
</script>
