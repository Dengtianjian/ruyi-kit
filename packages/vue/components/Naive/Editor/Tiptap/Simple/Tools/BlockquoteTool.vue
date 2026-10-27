<template>
  <ToolbarButton tooltip-content="引用" :active="editor.isActive('blockquote')"
    @click="editor.chain().focus().toggleBlockquote().run()">引用</ToolbarButton>
</template>

<script setup>
import ToolbarButton from '../ToolbarButton.vue';
import { useToolbarEditor } from './context';

const editor = useToolbarEditor();
</script>
