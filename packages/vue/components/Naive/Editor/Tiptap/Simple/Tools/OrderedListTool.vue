<template>
  <ToolbarButton tooltip-content="有序列表" :active="editor.isActive('orderedList')"
    @click="editor.chain().focus().toggleOrderedList().run()">1. 列表</ToolbarButton>
</template>

<script setup>
import ToolbarButton from '../ToolbarButton.vue';
import { useToolbarEditor } from './context';

const editor = useToolbarEditor();
</script>
