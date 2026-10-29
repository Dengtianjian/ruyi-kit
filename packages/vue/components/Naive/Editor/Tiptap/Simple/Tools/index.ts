/**
 * 编辑器工具栏工具组件的统一出口。
 *
 * 每个工具都是独立组件，靠 `useToolbarEditor()` 取编辑器实例，
 * 所以放进 `NaiveTiptapSimpleEditorToolbar` 的插槽里就能用，不需要逐个传 `editor`。
 *
 * 用法：
 * ```vue
 * <NaiveTiptapSimpleEditor v-model="content">
 *   <template #toolbar>
 *     <UndoTool />
 *     <RedoTool />
 *     <ToolbarDivider />
 *     <BoldTool />
 *   </template>
 * </NaiveTiptapSimpleEditor>
 * ```
 */
export { toolbarEditorKey, useToolbarEditor } from './context';

export { default as ToolbarDivider } from './ToolbarDivider.vue';

export { default as UndoTool } from './Undo.vue';
export { default as RedoTool } from './Redo.vue';

export { default as BoldTool } from './Bold.vue';
export { default as ItalicTool } from './Italic.vue';
export { default as UnderlineTool } from './Underline.vue';
export { default as StrikeTool } from './Strike.vue';
export { default as InlineCodeTool } from './InlineCode.vue';

// 1-6 级标题：逻辑都在 Heading 里，其余几个只是固定 level 的薄壳
export { default as HeadingTool } from './Heading.vue';
export { default as Heading1Tool } from './Heading1.vue';
export { default as Heading2Tool } from './Heading2.vue';
export { default as Heading3Tool } from './Heading3.vue';
export { default as Heading4Tool } from './Heading4.vue';
export { default as Heading5Tool } from './Heading5.vue';
export { default as Heading6Tool } from './Heading6.vue';
export { default as ParagraphTool } from './Paragraph.vue';

export { default as BulletListTool } from './BulletList.vue';
export { default as OrderedListTool } from './OrderedList.vue';
export { default as BlockquoteTool } from './Blockquote.vue';
export { default as CodeBlockTool } from './CodeBlock.vue';
export { default as HorizontalRuleTool } from './HorizontalRule.vue';

export { default as LinkTool } from './Link.vue';
export { default as UnlinkTool } from './Unlink.vue';
export { default as ImageTool } from './Image.vue';
export { default as ClearFormatTool } from './ClearFormat.vue';
