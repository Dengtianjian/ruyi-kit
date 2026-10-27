<template>
  <ToolbarButton tooltip-content="正文" :active="editor.isActive('paragraph')"
    @click="editor.chain().focus().setParagraph().run()">正文</ToolbarButton>
</template>

<script setup>
import ToolbarButton from '../ToolbarButton.vue';
import { useToolbarEditor } from './context';

const editor = useToolbarEditor();
</script>
