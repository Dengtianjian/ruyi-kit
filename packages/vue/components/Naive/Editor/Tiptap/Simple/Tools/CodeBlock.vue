<template>
  <ToolbarButton tooltip-content="代码块">
    <template #button>
      <n-input-group>
        <ToolbarButtonBase :active="editor.isActive('codeBlock')"
          @click="editor.chain().focus().toggleCodeBlock().run()">
          代码块
        </ToolbarButtonBase>
        <n-select v-if="editor.isActive('codeBlock')" size="small" title="代码块语言" v-model:value="currentLanguage"
          :options="languages" :style="{
            minWidth:'200px'
          }">
        </n-select>
      </n-input-group>
    </template>
  </ToolbarButton>
</template>

<script>
/**
 * 默认的可选语言，和 `lowlight` 注册的 `common` 语言集对齐。
 *
 * 放模块级而不是 `<script setup>` 里：props 的 `default` 工厂在 setup 执行前就会被调用，
 * 那时 setup 里的常量还在 TDZ 中。
 */
const defaultLanguages = [
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
</script>

<script setup>
import { computed } from 'vue';
import { NSelect, NInputGroup } from 'naive-ui';
import ToolbarButton from '../ToolbarButton.vue';
import ToolbarButtonBase from '../ToolbarButtonBase.vue';
import { useToolbarEditor } from './context';

/**
 * 代码块工具。
 *
 * 代码块激活时右侧出现语言选择器，可选语言用 `languages` 自定义
 * （就是 `n-select` 的 options，`{ value, label }[]`）。注意 `value` 必须是
 * highlight.js 的语言名，否则 lowlight 高亮不出来（HTML 要用 `xml`）：
 *
 * ```vue
 * <CodeBlockTool :languages="[
 *   { value: 'plaintext', label: '纯文本' },
 *   { value: 'javascript', label: 'JS' }
 * ]" />
 * ```
 */
defineProps({
  /** 可选语言，`{ value, label }[]`，默认是常用语言；传了就整体替换 */
  languages: { type: Array, default: () => defaultLanguages }
});

const editor = useToolbarEditor();

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
