<template>
  <ToolbarButton tooltip-content="分割线" @click="editor.chain().focus().setHorizontalRule().run()">
    <n-icon>
      <Subtract />
    </n-icon>
  </ToolbarButton>
</template>

<script setup>
import ToolbarButton from '../ToolbarButton.vue';
import { useToolbarEditor } from './context';
import { Subtract } from "@vicons/carbon";

const editor = useToolbarEditor();
</script>
