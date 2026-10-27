<template>
  <node-view-wrapper :class="{ 'is-selected': selected }">
    <!-- 自定义上传 UI：`ImageTool` 的 `uploader` prop（组件 / h 函数）或 `#upload` 插槽 -->
    <component :is="customUploader" v-if="customUploader" />
    <!-- 都没传时的默认实现：naive 的拖拽上传 -->
    <n-upload v-else multiple directory-dnd :accept="accept" :disabled="uploading" :show-file-list="false"
      :custom-request="handleRequest">
      <n-upload-dragger>
        <div style="margin-bottom: 12px">
          <n-icon size="48" :depth="3">
            <ImagesOutline />
          </n-icon>
        </div>
        <n-text style="font-size: 16px">
          点击或者拖动文件到该区域来上传
        </n-text>
        <n-p depth="3" style="margin: 8px 0 0 0">
          请不要上传敏感数据，比如你的银行卡号和密码，信用卡号有效期和安全码
        </n-p>
      </n-upload-dragger>
    </n-upload>
    <!-- <n-upload v-else class="image-upload-node__dragger" drag :accept="accept" :disabled="uploading"
      :show-file-list="false" :custom-request="handleRequest">
      <div class="image-upload-node__hint">
        <p class="image-upload-node__title">{{ uploading ? '上传中…' : '点击或拖拽图片到这里' }}</p>
        <p class="image-upload-node__desc">{{ accept }}</p>
      </div>
    </n-upload> -->
  </node-view-wrapper>
</template>

<script setup>
import { computed, defineComponent, h, ref } from 'vue';
import { NUpload } from 'naive-ui';
import { NodeViewWrapper } from '@tiptap/vue-3';
import { ImagesOutline } from "@vicons/ionicons5";

// NodeViewWrapper 是 ProseMirror 的渲染锚点，这里用不到 content 插槽
defineOptions({ inheritAttrs: false });

const props = defineProps({
  editor: { type: Object, required: true },
  node: { type: Object, required: true },
  getPos: { type: Function, required: true },
  deleteNode: { type: Function, required: true },
  selected: { type: Boolean, default: false }
});

/** 占位节点上的 `accept`（插入时由 `ImageTool` 写入） */
const accept = computed(() => props.node.attrs.accept || 'image/*');

/** 上传中标记：避免边传边再选，也让默认 UI 有个反馈 */
const uploading = ref(false);

/**
 * `ImageUpload` 扩展的 storage：`ImageTool` 往里写「上传函数 / 上传 UI」，
 * 这里读出来用（NodeView 不在工具组件的子树里，只能这么桥）。
 */
const storage = computed(() => props.editor.storage.imageUpload);
const customUpload = computed(() => storage.value?.upload?.value ?? null);

/**
 * 自定义上传 UI 的来源，优先级：`uploader` prop（组件 / h 函数）> `#upload` 插槽。
 *
 * 插槽函数和 h 函数的签名一样（收作用域、返 VNode），所以这里不区分；
 * 组件对象则交给 `h()` 渲染，作用域直接当 props 传下去。
 */
const customUI = computed(() => storage.value?.uploader?.value ?? storage.value?.uploadSlot?.value ?? null);

/**
 * 上传 UI 拿到的能力：自己实现上传只需要这几样。
 *
 * `upload` 接受 `File` / `FileList` / `File[]`，内部负责上传 + 替换节点，
 * 失败会把错误抛出来，交给自定义 UI 自己提示。
 */
const uploadScope = computed(() => ({
  accept: accept.value,
  uploading: uploading.value,
  upload: uploadFiles,
  remove: () => props.deleteNode()
}));

/**
 * 把「组件 / h 函数」统一包成一个组件，模板里 `<component :is>` 就能渲染。
 *
 * 必须包一层而不是直接调用：h 函数在渲染函数里执行才拿得到当前实例、
 * 才能正常收集响应式依赖（否则 `uploading` 变化不会重渲染）。
 */
const customUploader = computed(() => {
  const ui = customUI.value;
  if (!ui) return null;

  return defineComponent({
    name: 'ImageUploadCustomUI',
    setup: () => () => (typeof ui === 'function' ? ui(uploadScope.value) : h(ui, uploadScope.value))
  });
});

/** 从 `File` / `FileList` / `File[]` 里取第一个文件 */
function pickFile(input) {
  if (!input) return null;

  if (input instanceof File) return input;

  const files = Array.from(input);
  return files.find((item) => item instanceof File) ?? null;
}

/**
 * 上传并替换掉占位节点。
 *
 * 上传函数来自 `ImageTool` 的 `upload` prop；没传就用 `FileReader` 转 base64
 * （`ImageTool` 默认给 `Image` 开了 `allowBase64`，可以直接显示）。
 */
async function uploadFiles(input) {
  const file = pickFile(input);
  if (!file || uploading.value) return;

  uploading.value = true;

  try {
    const src = await (customUpload.value ? customUpload.value(file) : fileToDataURL(file));

    if (!src) throw new Error('上传没有返回图片地址');

    replaceWithImage(String(src));
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

/**
 * 用 `image` 节点替换当前占位节点。
 *
 * 占位是块级原子节点，`getPos()` 给的是节点起点，`nodeSize` 就是整块长度，
 * 所以直接 `insertContentAt({ from, to })` 把这一整段换掉。
 */
function replaceWithImage(src) {
  const pos = props.getPos();
  if (typeof pos !== 'number') return;

  props.editor
    .chain()
    .focus()
    .insertContentAt({ from: pos, to: pos + props.node.nodeSize }, { type: 'image', attrs: { src } })
    .run();
}

/** `n-upload` 的自定义请求：把文件交给统一的 `uploadFiles`，结束后告诉组件收尾 */
function handleRequest({ file, onFinish, onError }) {
  uploadFiles(file?.file)
    .then(() => onFinish())
    .catch((error) => {
      console.error('[simple-editor] 图片上传失败', error);
      onError();
    });
}
</script>

<style scoped>
.image-upload-node {
  margin: 8px 0;
}

.image-upload-node.is-selected {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
  border-radius: 8px;
}

.image-upload-node__hint {
  padding: 8px 12px;
}

.image-upload-node__title {
  margin: 0;
  font-size: 14px;
  color: #374151;
}

.image-upload-node__desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: #9ca3af;
}
</style>
