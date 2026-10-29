<template>
  <ToolbarButton tooltip-content="下划线" :active="editor.isActive('underline')"
    @click="editor.chain().focus().toggleUnderline().run()"><u>U</u></ToolbarButton>
</template>

<script setup>
import ToolbarButton from '../ToolbarButton.vue';
import { useToolbarEditor } from './context';

const editor = useToolbarEditor();
</script>
