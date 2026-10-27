import { inject, type ComputedRef, type InjectionKey } from 'vue';
import type { Editor } from '@tiptap/vue-3';

/**
 * 工具栏把编辑器实例 provide 下去，工具组件就不必各自再声明一个 `editor` prop。
 *
 * 存的是 `ComputedRef`：模板里自动解包，直接 `editor.chain()` 即可。
 */
export const toolbarEditorKey: InjectionKey<ComputedRef<Editor>> = Symbol('simple-editor-toolbar-editor');

/**
 * 工具组件取编辑器实例。
 *
 * 必须在 `NaiveTiptapSimpleEditorToolbar` 的子树里调用 —— inject 沿「渲染时」的实例链查找，
 * 所以通过 `#toolbar` 插槽传进去的工具组件同样能拿到。
 * 取不到直接抛错，避免静默变成 undefined 之后在 `editor.chain()` 上炸得莫名其妙。
 */
export function useToolbarEditor(): ComputedRef<Editor> {
  const editor = inject(toolbarEditorKey, null);

  if (!editor) {
    throw new Error('[simple-editor] 工具组件必须放在 NaiveTiptapSimpleEditorToolbar 内');
  }

  return editor;
}
