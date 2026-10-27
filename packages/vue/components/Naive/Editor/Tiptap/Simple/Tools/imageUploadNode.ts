/**
 * 「待上传图片」占位节点。
 *
 * 点工具栏的「图片」时先插入这个块级占位节点，正文里直接出现上传区；
 * 选好文件、拿到地址后由 NodeView 把它整块替换成真正的 `image` 节点。
 *
 * 节点本身不含内容（`atom`），序列化成一个 `div[data-image-upload]`：
 * 占位状态也能保存进 HTML，重新打开时照样显示上传区、不会丢内容。
 */
import { Node, mergeAttributes } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import { shallowRef } from 'vue';
import ImageUploadNodeView from './ImageUploadNodeView.vue';

export const ImageUpload = Node.create({
  name: 'imageUpload',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      /** 允许选择的文件类型，插入时由 `ImageTool` 的 `accept` prop 写进来 */
      accept: {
        default: 'image/*',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-accept') || 'image/*',
        renderHTML: (attributes: Record<string, any>) => ({ 'data-accept': attributes.accept })
      }
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-image-upload]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-image-upload': '' })];
  },

  addNodeView() {
    return VueNodeViewRenderer(ImageUploadNodeView);
  },

  /**
   * 跨组件树的桥。
   *
   * NodeView 渲染在正文里，组件树上是编辑器的子节点，不是 `ImageTool` 的子节点，
   * 所以工具组件的 props / 插槽没法通过 inject 传进去。这里借扩展 storage 中转：
   * `ImageTool` 写、NodeView 读。
   *
   * 用 `shallowRef` 而不是普通字段：写进来之后 NodeView 里的 computed 能自动重渲染。
   */
  addStorage() {
    return {
      /** `(file: File) => Promise<string> | string`；为空时 NodeView 退化成转 base64 */
      upload: shallowRef(null),
      /** `ImageTool` 的 `uploader` prop：Vue 组件或 h 函数 */
      uploader: shallowRef(null),
      /** `ImageTool` 的 `#upload` 插槽函数（`uploader` 没传时才用） */
      uploadSlot: shallowRef(null)
    };
  }
});
