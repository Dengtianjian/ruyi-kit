<template>
  <ToolbarButton tooltip-content="插入图片" @click="open">图片</ToolbarButton>

  <n-modal v-model:show="show" preset="card" title="插入图片" :mask-closable="!uploading"
    :style="{ width: '460px' }">
    <!-- 插槽只给一个 `insert(src)`：自己上传拿到地址后交给它，插入图片并关弹窗 -->
    <slot name="upload" :insert="insertImage">
      <!-- 拖拽上传：naive 的 n-upload-dragger -->
      <n-upload v-if="mode === 'drag'" v-bind="uploadAttrs">
        <n-upload-dragger>
          <span>点击或拖拽图片到此区域</span>
        </n-upload-dragger>
      </n-upload>

      <!-- 点击上传：n-upload 包一个按钮 -->
      <n-upload v-else v-bind="uploadAttrs">
        <n-button :loading="uploading">选择图片</n-button>
      </n-upload>
    </slot>
  </n-modal>
</template>

<script setup>
import { computed, ref } from 'vue';
import { NModal, NUpload, NUploadDragger, NButton } from 'naive-ui';
import ToolbarButton from '../ToolbarButton.vue';
import { useToolbarEditor } from './context';

/**
 * 图片工具。
 *
 * 点工具栏「图片」弹出弹窗，上传方式由 `mode` 决定（组件控制，不是让用户在弹窗里选）：
 * - `mode="drag"`：`n-upload-dragger` 拖拽区；
 * - `mode="click"`：一个「选择图片」按钮。
 *
 * 上传完拿到地址就插入编辑器并关闭弹窗。
 *
 * 想自己写上传 UI 和逻辑就用 `#upload` 插槽，作用域只有一个 `insert(src)`：
 *
 * ```vue
 * <ImageTool mode="click">
 *   <template #upload="{ insert }">
 *     <MyUploader @success="insert" />
 *   </template>
 * </ImageTool>
 * ```
 *
 * 默认 UI 的 `n-upload` 参数全部通过 `uploadProps` 传进去（`accept` / `multiple` /
 * `customRequest` / `action` … 都行），组件只补两个默认值：
 * `accept: 'image/*'`、`showFileList: false`。
 */
const props = defineProps({
  /**
   * 上传函数 `(file: File) => Promise<string> | string`，返回图片地址。
   * 不传就转 base64（需要 `Image` 的 `allowBase64`，默认已开）。
   */
  upload: { type: Function, default: null },
  /** 原样透传给 `n-upload` 的 props */
  uploadProps: { type: Object, default: () => ({}) },
  /** 上传方式：`drag` 拖拽区域 / `click` 点击按钮 */
  mode: {
    type: String,
    default: 'drag',
    validator: (value) => ['drag', 'click'].includes(value)
  }
});

const editor = useToolbarEditor();

/** 弹窗开关 */
const show = ref(false);
/** 上传中标记：禁用控件、避免重复上传 */
const uploading = ref(false);

/**
 * 合并后交给 `n-upload` 的参数。
 *
 * 用户传的同名项优先（包括 `customRequest`）；只有 `customRequest` 没传时才用组件的
 * 默认流程（`upload` prop 或转 base64）。`disabled` 在上传中强制为 true。
 */
const uploadAttrs = computed(() => ({
  accept: 'image/*',
  showFileList: false,
  ...props.uploadProps,
  customRequest: props.uploadProps?.customRequest ?? handleRequest,
  disabled: uploading.value || Boolean(props.uploadProps?.disabled)
}));

function open() {
  uploading.value = false;
  show.value = true;
}

function close() {
  show.value = false;
}

/** 把图片地址插到光标处并关闭弹窗（插槽 / 默认上传流程都走这里） */
function insertImage(src) {
  if (!src) return;

  editor.value.chain().focus().setImage({ src: String(src) }).run();
  close();
}

/** 从 `File` / `FileList` / `File[]` 里取第一个文件 */
function pickFile(input) {
  if (!input) return null;

  if (input instanceof File) return input;

  const files = Array.from(input);
  return files.find((item) => item instanceof File) ?? null;
}

/**
 * 默认上传流程：拿到文件 → 交给 `upload` prop（没传就转 base64）→ 插入。
 *
 * 失败会把错误抛出来，交给调用方提示。
 */
async function uploadFiles(input) {
  const file = pickFile(input);
  if (!file || uploading.value) return;

  uploading.value = true;

  try {
    const src = await (props.upload ? props.upload(file) : fileToDataURL(file));

    if (!src) throw new Error('上传没有返回图片地址');

    insertImage(src);
  } finally {
    uploading.value = false;
  }
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

/** `n-upload` 的自定义请求：交给统一的 `uploadFiles`，结束后告诉组件收尾 */
function handleRequest({ file, onFinish, onError }) {
  uploadFiles(file?.file)
    .then(() => onFinish())
    .catch((error) => {
      console.error('[simple-editor] 图片上传失败', error);
      onError();
    });
}
</script>
