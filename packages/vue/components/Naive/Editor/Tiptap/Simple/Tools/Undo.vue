<template>
  <ToolbarButton tooltip-content="撤销" :disabled="!editor.can().undo()" @click="editor.chain().focus().undo().run()">
    <n-icon>
      <Undo />
    </n-icon>
  </ToolbarButton>
</template>

<script setup>
import ToolbarButton from '../ToolbarButton.vue';
import { useToolbarEditor } from './context';
import { Undo } from "@vicons/carbon";

const editor = useToolbarEditor();
</script>
