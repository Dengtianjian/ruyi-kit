<template>
  <ToolbarButton tooltip-content="重做" :disabled="!editor.can().redo()" @click="editor.chain().focus().redo().run()">
    <n-icon >
      <Redo />
    </n-icon>
  </ToolbarButton>
</template>

<script setup>
import ToolbarButton from '../ToolbarButton.vue';
import { useToolbarEditor } from './context';
import { Redo } from "@vicons/carbon";

const editor = useToolbarEditor();
</script>
