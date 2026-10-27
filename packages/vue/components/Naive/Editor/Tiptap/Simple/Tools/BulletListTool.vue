<template>
  <ToolbarButton tooltip-content="无序列表" :active="editor.isActive('bulletList')"
    @click="editor.chain().focus().toggleBulletList().run()">• 列表</ToolbarButton>
</template>

<script setup>
import ToolbarButton from '../ToolbarButton.vue';
import { useToolbarEditor } from './context';

const editor = useToolbarEditor();
</script>
