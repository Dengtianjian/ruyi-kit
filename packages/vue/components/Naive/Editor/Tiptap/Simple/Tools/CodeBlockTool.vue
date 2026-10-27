<template>
  <ToolbarButton tooltip-content="代码块">
    <template #button>
      <n-input-group>
        <ToolbarButtonBase :active="editor.isActive('codeBlock')"
          @click="editor.chain().focus().toggleCodeBlock().run()">
          代码块
        </ToolbarButtonBase>
        <n-select v-if="editor.isActive('codeBlock')" size="small" title="代码块语言" v-model:value="currentLanguage"
          :options="codeLanguages" :style="{
            minWidth:'200px'
          }">
        </n-select>
      </n-input-group>
    </template>
  </ToolbarButton>
</template>

<script setup>
import { computed } from 'vue';
import { NSelect, NInputGroup } from 'naive-ui';
import ToolbarButton from '../ToolbarButton.vue';
import ToolbarButtonBase from '../ToolbarButtonBase.vue';
import { useToolbarEditor } from './context';

const editor = useToolbarEditor();

/** 可选语言，和 `lowlight` 注册的 `common` 语言集对齐 */
const codeLanguages = [
  { value: 'plaintext', label: '纯文本' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  // highlight.js 里 HTML 归在 xml 下，写成 html 会命中不了语法
  { value: 'xml', label: 'HTML / XML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'php', label: 'PHP' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' }
];

/**
 * 当前代码块的语言。
 *
 * 写成可写 computed，`n-select` 的 `v-model:value` 才能直接绑：
 * 读时取节点的 `language`，写时 `updateAttributes`（lowlight 据此重新高亮）。
 */
const currentLanguage = computed({
  get: () => editor.value.getAttributes('codeBlock').language ?? 'plaintext',
  set: (language) => editor.value.chain().focus().updateAttributes('codeBlock', { language }).run()
});
</script>
