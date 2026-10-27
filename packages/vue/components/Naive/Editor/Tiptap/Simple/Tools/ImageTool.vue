<template>
  <ToolbarButton tooltip-content="插入图片" @click="insertUpload">图片</ToolbarButton>
</template>

<script setup>
import { onMounted, onUpdated, useSlots } from 'vue';
import ToolbarButton from '../ToolbarButton.vue';
import { useToolbarEditor } from './context';

/**
 * 图片工具。
 *
 * 流程是「先插入上传组件，再选文件替换」：
 * 点击后往正文插一个 `imageUpload` 占位节点，占位节点自己渲染上传区，
 * 上传拿到地址后把它整块换成图片。
 *
 * 上传区默认是 naive 的拖拽上传（`n-upload drag`），想换掉有两种写法，
 * 都能拿到作用域 `{ accept, uploading, upload, remove }`
 * （`upload` 收 `File` / `FileList` / `File[]`）：
 *
 * ```vue
 * <!-- 1. 传组件：作用域当 props 传下去 -->
 * <ImageTool :upload="uploadFile" :uploader="MyUploader" />
 *
 * <!-- 2. 传 h 函数：作用域是第一个参数 -->
 * <ImageTool :upload="uploadFile"
 *   :uploader="({ uploading, upload }) => h('input', {
 *     type: 'file',
 *     disabled: uploading,
 *     onChange: (e) => upload(e.target.files)
 *   })" />
 *
 * <!-- 3. 也可以继续用插槽（`uploader` 没传时才生效） -->
 * <ImageTool :upload="uploadFile">
 *   <template #upload="{ upload }">
 *     <input type="file" @change="upload($event.target.files)" />
 *   </template>
 * </ImageTool>
 * ```
 */
const props = defineProps({
  /**
   * 上传函数 `(file: File) => Promise<string> | string`，返回图片地址。
   * 不传就转 base64（需要 `Image` 的 `allowBase64`，默认已开）。
   */
  upload: { type: Function, default: null },
  /** 允许选择的文件类型，透给 `n-upload` 的 `accept` */
  accept: { type: String, default: 'image/*' },
  /**
   * 自定义上传 UI：Vue 组件，或 h 函数（返回 VNode）。
   *
   * 两种写法收到的都是同一份作用域 `{ accept, uploading, upload, remove }`：
   * 组件当成 props 传下去，h 函数按参数传入。传了它就不再使用 `#upload` 插槽。
   */
  uploader: { type: [Object, Function], default: null }
});

const editor = useToolbarEditor();
const slots = useSlots();

/**
 * 把「上传函数」和「上传 UI（prop 组件 / h 函数 / 插槽）」写进 `ImageUpload` 扩展的 storage。
 *
 * 占位节点（NodeView）渲染在正文里，组件树上不是本组件的子节点，inject 传不过去，
 * 只能借编辑器实例中转。挂载后同步一次，之后本组件每次更新（父级换了插槽 / 上传函数）
 * 再同步，正在编辑的占位节点会自动刷新。
 */
function syncBridge() {
  const storage = editor.value?.storage?.imageUpload;
  if (!storage) return;

  storage.upload.value = props.upload ?? null;
  storage.uploader.value = props.uploader ?? null;
  storage.uploadSlot.value = slots.upload ?? null;
}

onMounted(syncBridge);
onUpdated(syncBridge);

/**
 * 在光标处插入一个待上传的图片占位节点。
 *
 * 占位节点来自 `ImageUpload` 扩展：用默认扩展集合时已经有了；
 * 自己传 `extensions` 时如果漏了它，这里给个明确提示，而不是静默失败。
 */
function insertUpload() {
  if (!editor.value?.storage?.imageUpload) {
    console.warn('[simple-editor] 缺少 ImageUpload 扩展，图片工具无法插入上传组件');
    return;
  }

  syncBridge();

  editor.value
    .chain()
    .focus()
    .insertContent({ type: 'imageUpload', attrs: { accept: props.accept } })
    .run();
}
</script>
