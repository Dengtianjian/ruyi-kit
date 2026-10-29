<template>
  <ToolbarButton tooltip-content="删除线" :active="editor.isActive('strike')"
    @click="editor.chain().focus().toggleStrike().run()"><s>S</s></ToolbarButton>
</template>

<script setup>
import ToolbarButton from '../ToolbarButton.vue';
import { useToolbarEditor } from './context';

const editor = useToolbarEditor();
</script>
