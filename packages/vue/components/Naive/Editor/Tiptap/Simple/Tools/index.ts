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

// 自己传 `extensions` 给编辑器时，图片工具的占位节点扩展要一起带上
export { ImageUpload } from './imageUploadNode';

export { default as ToolbarDivider } from './ToolbarDivider.vue';

export { default as UndoTool } from './UndoTool.vue';
export { default as RedoTool } from './RedoTool.vue';

export { default as BoldTool } from './BoldTool.vue';
export { default as ItalicTool } from './ItalicTool.vue';
export { default as UnderlineTool } from './UnderlineTool.vue';
export { default as StrikeTool } from './StrikeTool.vue';
export { default as InlineCodeTool } from './InlineCodeTool.vue';

export { default as Heading2Tool } from './Heading2Tool.vue';
export { default as Heading3Tool } from './Heading3Tool.vue';
export { default as ParagraphTool } from './ParagraphTool.vue';

export { default as BulletListTool } from './BulletListTool.vue';
export { default as OrderedListTool } from './OrderedListTool.vue';
export { default as BlockquoteTool } from './BlockquoteTool.vue';
export { default as CodeBlockTool } from './CodeBlockTool.vue';
export { default as HorizontalRuleTool } from './HorizontalRuleTool.vue';

export { default as LinkTool } from './LinkTool.vue';
export { default as UnlinkTool } from './UnlinkTool.vue';
export { default as ImageTool } from './ImageTool.vue';
export { default as ClearFormatTool } from './ClearFormatTool.vue';
