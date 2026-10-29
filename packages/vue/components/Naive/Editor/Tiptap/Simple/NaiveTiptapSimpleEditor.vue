<template>
  <div v-if="editor" class="simple-editor">
    <Toolbar :editor="editor">
      <!-- 默认给全套工具，外部用 `#toolbar` 覆盖即可自由取舍 -->
      <slot name="toolbar">
        <Space gap="10px" wrap align="center">
          <UndoTool />
          <RedoTool />
          <ToolbarDivider />

          <BoldTool />
          <ItalicTool />
          <UnderlineTool />
          <StrikeTool />
          <InlineCodeTool />
          <ToolbarDivider />

          <Heading1Tool />
          <Heading2Tool />
          <Heading3Tool />
          <Heading4Tool />
          <Heading5Tool />
          <Heading6Tool />
          <ParagraphTool />
          <ToolbarDivider />

          <BulletListTool />
          <OrderedListTool />
          <BlockquoteTool />
          <CodeBlockTool />
          <HorizontalRuleTool />
          <ToolbarDivider />

          <LinkTool />
          <ImageTool />
          <ClearFormatTool />
        </Space>
      </slot>
    </Toolbar>
    <EditorContent :editor="editor" class="simple-editor-content" :style="contentStyle" />
  </div>
</template>

<script>
import { createLowlight, common } from 'lowlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';

/**
 * 语法高亮用的 lowlight 实例。
 *
 * 语法表是纯数据、与组件实例无关，所以放模块级只建一次；
 * `common` 覆盖常用语言（js / ts / html / css / json / sql / python / go / rust …），
 * 需要更全的换 `all`，代价是打包体积。
 */
const lowlight = createLowlight(common);

/**
 * 默认扩展集合：不传 `extensions` prop 时用它。
 *
 * 想改某个扩展的配置就自己传 `extensions`（会整体替换这里的默认值），
 * 比如只改链接：`[StarterKit.configure(...), Link.configure({ openOnClick: true }), ...]`。
 *
 * @param {string} placeholder 空内容时的提示文案
 */
function createDefaultExtensions(placeholder) {
  return [
    // StarterKit 自带的 link / codeBlock 关掉，换成下面配置过的版本
    StarterKit.configure({ link: false, codeBlock: false }),
    Link.configure({
      // 正文里的链接点了要能继续编辑，而不是跳走
      openOnClick: false,
      autolink: true,
      linkOnPaste: true
    }),
    CodeBlockLowlight.configure({
      lowlight,
      // 没写语言标记的代码块按纯文本处理，不猜语言、也不会报警告
      defaultLanguage: 'plaintext'
    }),
    // `allowBase64`：图片工具没配 `upload` 时靠它显示 base64 图片
    Image.configure({ inline: false, allowBase64: true }),
    Placeholder.configure({ placeholder })
  ];
}
</script>

<script setup>
import { computed, watch } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import Toolbar from './Toolbar.vue';
import Space from '../../../../Base/Space.vue';
import {
  UndoTool,
  RedoTool,
  ToolbarDivider,
  BoldTool,
  ItalicTool,
  UnderlineTool,
  StrikeTool,
  InlineCodeTool,
  Heading1Tool,
  Heading2Tool,
  Heading3Tool,
  Heading4Tool,
  Heading5Tool,
  Heading6Tool,
  ParagraphTool,
  BulletListTool,
  OrderedListTool,
  BlockquoteTool,
  CodeBlockTool,
  HorizontalRuleTool,
  LinkTool,
  ImageTool,
  ClearFormatTool
} from './Tools';

const props = defineProps({
  /** 内容（HTML） */
  modelValue: { type: String, default: '' },
  /** 空内容时的提示文案 */
  placeholder: { type: String, default: '开始写点内容…' },
  /** 是否可编辑 */
  editable: { type: Boolean, default: true },
  /** 内容区最小高度，数字按 px 处理 */
  minHeight: { type: [Number, String], default: 240 },
  /**
   * Tiptap 扩展列表（已 `configure` 好的实例数组）。
   *
   * 不传就用内置默认：StarterKit + Link + 代码块高亮 + Image + Placeholder。
   * 传了就**整体替换**默认集合，所以工具依赖的扩展要一起带上：
   * - `LinkTool` 需要 link；
   * - `CodeBlockTool` 需要带 lowlight 的 codeBlock；
   * - `ImageTool` 需要 image（还要开 `allowBase64`，否则默认的 base64 上传没法显示）。
   *
   * 只在**创建编辑器时**读取一次：扩展不支持运行期热换，动态改这个 prop 不会重建编辑器。
   */
  extensions: { type: Array, default: null }
})

const emit = defineEmits(['update:modelValue', 'ready'])

const contentStyle = computed(() => ({
  minHeight: typeof props.minHeight === 'number' ? `${props.minHeight}px` : props.minHeight
}))

/**
 * 编辑器实例。
 *
 * `useEditor` 在 `onMounted` 里 `new Editor()`，失败时不会抛给调用方、`editor` 会一直是
 * `undefined`，所以模板必须用 `v-if="editor"` 兜住：否则 toolbar 会拿 `undefined` 去调
 * `isActive()` 直接报错，整块渲染崩掉。
 */
const editor = useEditor({
  content: props.modelValue,
  editable: props.editable,
  // 传了 `extensions` 就整体接管；否则用内置默认集合（见上面 `createDefaultExtensions`）
  extensions: props.extensions ?? createDefaultExtensions(props.placeholder),
  onUpdate({ editor }) {
    emit('update:modelValue', editor.getHTML())
  },
  onCreate({ editor }) {
    emit('ready', editor)
  }
})

// 外部改值时同步进来；和当前内容一致就不再 setContent，避免光标跳动
watch(
  () => props.modelValue,
  (value) => {
    const instance = editor.value
    if (!instance) return

    const next = value ?? ''
    if (next === instance.getHTML()) return

    instance.commands.setContent(next, { emitUpdate: false })
  }
)

watch(
  () => props.editable,
  (value) => {
    editor.value?.setEditable(value)
  }
)

/** 编辑器销毁由 `useEditor` 内部的 `onBeforeUnmount` 负责，这里不再重复 destroy */

defineExpose({
  /** 编辑器实例（未初始化完成时为 `undefined`） */
  editor,
  /** 当前内容 */
  getHTML: () => editor.value?.getHTML() ?? '',
  /** 覆盖内容（不触发 `update:modelValue`，需要的话手动 emit） */
  setContent: (content) => editor.value?.commands.setContent(content ?? '', { emitUpdate: false }),
  /** 聚焦到正文末尾 */
  focus: () => editor.value?.commands.focus('end'),
  /** 清空内容 */
  clear: () => editor.value?.commands.clearContent(true)
})
</script>

<style scoped>
.simple-editor {
  list-style: unset;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.simple-editor-content {
  padding: 12px 16px;
  outline: none;
}

.simple-editor-content:focus-within {
  border-color: #6366f1;
}

/* ProseMirror 内部节点由编辑器动态创建，拿不到 scope id，只能用 `:deep()` */
.simple-editor-content :deep(.ProseMirror) {
  outline: none;
  min-height: inherit;
}

.simple-editor-content :deep(.ProseMirror > * + *) {
  margin-top: 0.75em;
}

.simple-editor-content :deep(p.is-editor-empty:first-child::before) {
  color: #9ca3af;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

.simple-editor-content :deep(ul),
.simple-editor-content :deep(ol) {
  padding-left: 1.25em;
}

.simple-editor-content :deep(blockquote) {
  margin: 0;
  padding-left: 12px;
  border-left: 3px solid #e5e7eb;
  color: #6b7280;
}

.simple-editor-content :deep(pre) {
  padding: 12px;
  border-radius: 6px;
  background: #f3f4f6;
  overflow-x: auto;
}

.simple-editor-content :deep(code) {
  padding: 1px 4px;
  border-radius: 4px;
  background: #f3f4f6;
  font-size: 0.9em;
}

.simple-editor-content :deep(pre code) {
  padding: 0;
  background: none;
}

/* ---- 代码块语法高亮 ---- */
/* 对应 lowlight 输出的 hljs-* token，浅色主题（GitHub 系） */
.simple-editor-content :deep(.hljs-comment),
.simple-editor-content :deep(.hljs-quote) {
  color: #6a737d;
  font-style: italic;
}

.simple-editor-content :deep(.hljs-keyword),
.simple-editor-content :deep(.hljs-selector-tag),
.simple-editor-content :deep(.hljs-doctag),
.simple-editor-content :deep(.hljs-meta .hljs-keyword) {
  color: #d73a49;
}

.simple-editor-content :deep(.hljs-string),
.simple-editor-content :deep(.hljs-regexp),
.simple-editor-content :deep(.hljs-addition),
.simple-editor-content :deep(.hljs-attribute),
.simple-editor-content :deep(.hljs-meta .hljs-string) {
  color: #032f62;
}

.simple-editor-content :deep(.hljs-number),
.simple-editor-content :deep(.hljs-literal),
.simple-editor-content :deep(.hljs-variable),
.simple-editor-content :deep(.hljs-template-variable),
.simple-editor-content :deep(.hljs-type),
.simple-editor-content :deep(.hljs-params) {
  color: #005cc5;
}

.simple-editor-content :deep(.hljs-title),
.simple-editor-content :deep(.hljs-section),
.simple-editor-content :deep(.hljs-selector-id),
.simple-editor-content :deep(.hljs-title.function_) {
  color: #6f42c1;
}

.simple-editor-content :deep(.hljs-attr),
.simple-editor-content :deep(.hljs-name),
.simple-editor-content :deep(.hljs-selector-class),
.simple-editor-content :deep(.hljs-selector-attr) {
  color: #22863a;
}

.simple-editor-content :deep(.hljs-built_in),
.simple-editor-content :deep(.hljs-symbol),
.simple-editor-content :deep(.hljs-bullet) {
  color: #e36209;
}

.simple-editor-content :deep(.hljs-deletion) {
  color: #b31d28;
  background: #ffeef0;
}

.simple-editor-content :deep(.hljs-emphasis) {
  font-style: italic;
}

.simple-editor-content :deep(.hljs-strong) {
  font-weight: 600;
}

.simple-editor-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
}

.simple-editor-content :deep(a) {
  color: #4f46e5;
  text-decoration: underline;
}

.simple-editor-content :deep(hr) {
  border: none;
  border-top: 1px solid #e5e7eb;
}
</style>
