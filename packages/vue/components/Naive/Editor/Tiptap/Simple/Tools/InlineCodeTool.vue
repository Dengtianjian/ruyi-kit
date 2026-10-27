<template>
  <ToolbarButton tooltip-content="行内代码" :active="editor.isActive('code')"
    @click="editor.chain().focus().toggleCode().run()">&lt;/&gt;</ToolbarButton>
</template>

<script setup>
import ToolbarButton from '../ToolbarButton.vue';
import { useToolbarEditor } from './context';

const editor = useToolbarEditor();
</script>
