<template>
  <div
    class="upload"
    :class="{ 'upload--drag': drag, 'upload--dragging': dragging, 'upload--full': !canAdd }"
    @dragenter="handleDragEnter"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <div class="upload-trigger" @click="open">
      <slot name="trigger" :open="open">上传</slot>
    </div>

    <input
      ref="inputRef"
      class="upload-input"
      type="file"
      v-bind="inputProps"
      :multiple="multiple"
      :accept="accept"
      @change="handleInputChange"
    />

    <!-- 默认渲染文件名列表，业务想自己排版就用默认插槽覆盖 -->
    <slot :files="list" :upload="upload" :remove="remove" :dragging="dragging">
      <ul class="upload-files">
        <li v-for="item in list" :key="item.id ?? item.name" class="upload-file">
          <a
            v-if="item.url"
            class="upload-file-name"
            :href="item.url"
            target="_blank"
            rel="noopener noreferer"
          >{{ item.name }}</a>
          <span v-else class="upload-file-name">{{ item.name }}</span>

          <button type="button" class="upload-file-remove" title="删除" @click.stop="remove(item)">×</button>
        </li>
      </ul>
    </slot>
  </div>
</template>

<script lang="ts" setup>
/**
 * 上传基组件：只做「选文件 / 拖文件 → 交给业务上传 → 维护列表」，不依赖任何 UI 库。
 *
 * - `trigger` 插槽：触发上传的区域，默认渲染「上传」两个字，点击打开文件选择框
 * - 默认插槽：渲染文件列表，默认用 `ul + li` 列出文件名（有 `url` 就渲染成链接）
 * - `drag`：是否开启拖拽上传
 * - `max`：最多几个文件（不传则不限；单文件模式固定 1 个）
 * - `sizeLimit`：单个文件大小上限（字节），超出的文件直接跳过
 * - `deleteRemote`：删除时是否走 `@delete`；`false` 只移除本地记录
 * - `inputProps`：透传给 `input[type=file]` 的其它属性（`capture`、`webkitdirectory`…）
 * - `v-model:file`：单文件；`v-model:files`：多文件，两者始终互相同步（`file` 取列表第一个）
 * - `@upload`：拿到原始 `File`，返回上传后的文件信息，返回值直接写进列表；返回空视为放弃
 * - `@delete`：返回 `true` 才移除，`false`（或抛错）则保留
 * - `@change`：列表变化后回调
 *
 * 组件本身不发请求，也不认识后端的文件结构：返回什么就存什么，需要什么字段由业务自己决定。
 */
import { computed, ref, watch } from 'vue';
import type {
  TUploadChangeHandler,
  TUploadDeleteHandler,
  TUploadFileInfo,
  TUploadHandler
} from '../../../types/upload';

const Props = withDefaults(defineProps<{
  /** 多文件：决定 input 的 `multiple` 与上传后是追加还是替换 */
  multiple?: boolean,
  /** 是否开启拖拽上传 */
  drag?: boolean,
  /** 最多几个文件（不传则不限）；单文件模式固定 1 个 */
  max?: number,
  /** 单个文件大小上限（字节），超出的文件直接跳过 */
  sizeLimit?: number,
  /** 删除时是否走 `@delete`：`false` 只移除本地记录，不调删除接口 */
  deleteRemote?: boolean,
  /** 文件选择框的 `accept` */
  accept?: string,
  /** 直接透传给 `input[type=file]` 的其它属性（`capture`、`webkitdirectory`、`directory`…） */
  inputProps?: Record<string, unknown>,
  /** 上传（`@upload`）：返回上传后的文件信息 */
  onUpload?: TUploadHandler,
  /** 删除（`@delete`）：返回 `true` 才移除 */
  onDelete?: TUploadDeleteHandler,
  /** 列表变化（`@change`） */
  onChange?: TUploadChangeHandler
}>(), {
  multiple: false,
  drag: false,
  max: null,
  sizeLimit: null,
  deleteRemote: true,
  accept: null,
  inputProps: () => ({})
});

/** 单文件：始终是 `files` 的第一个 */
const file = defineModel<TUploadFileInfo | null>('file', { default: null });
/** 文件列表 */
const files = defineModel<Array<TUploadFileInfo>>('files', { default: () => [] });

const inputRef = ref<HTMLInputElement>(null);
/** 是否正拖拽文件经过（`drag` 开启时才有意义） */
const dragging = ref(false);
/** dragenter / dragleave 会在子元素上反复触发，用计数抵消 */
let dragDepth = 0;
let idSeed = 0;

/** 当前列表 */
const list = computed(() => files.value ?? []);

/** 还能再放几个：`max` 没设置就是无限 */
function remaining() {
  if (Props.max == null) return Infinity;

  return Math.max(0, Props.max - list.value.length);
}

/** 还能不能继续加：单文件模式是替换，永远可以 */
const canAdd = computed(() => (Props.multiple ? remaining() > 0 : true));

// 只绑了 `file`（没绑 `files`）时，用它兜底成单元素列表
if (!files.value.length && file.value) {
  files.value = [file.value];
}

/** 统一出口：写回两个 model 并通知 `@change` */
function change(next: Array<TUploadFileInfo>) {
  files.value = next;
  file.value = next[0] ?? null;
  Props.onChange?.(next);
}

/** `files` 变化时同步 `file`（取第一个） */
watch(files, (value) => {
  const first = value?.[0] ?? null;
  if (file.value === first) return;

  file.value = first;
}, { deep: true });

/** 外部只改 `file` 时，同步成单元素列表 */
watch(file, (value) => {
  if ((files.value?.[0] ?? null) === value) return;

  files.value = value ? [value] : [];
});

/** 打开文件选择框（已经到 `max` 就不弹了） */
function open() {
  if (!canAdd.value) {
    console.warn(`[Upload] 最多上传 ${Props.max} 个文件`);
    return;
  }

  inputRef.value?.click();
}

/** 字节 → MB（只用于提示文案） */
function toMB(bytes: number) {
  return Math.round(bytes / 1024 / 1024);
}

/** 生成一个兜底 id：`@upload` 没返回 id 时保证列表 key 唯一 */
function createId() {
  idSeed += 1;
  return `upload-${Date.now()}-${idSeed}`;
}

/** 两个文件项是不是同一个（优先按 id 比） */
function isSameFile(a: TUploadFileInfo, b: TUploadFileInfo) {
  if (a.id != null && b.id != null) return a.id === b.id;
  return a === b;
}

/** `FileList` / `File[]` / 单个 `File` 统一成数组 */
function toFiles(target: File | ArrayLike<File>): File[] {
  if (typeof File !== 'undefined' && target instanceof File) return [target];

  return Array.from((target ?? []) as ArrayLike<File>);
}

/**
 * 上传：把原始文件交给 `@upload`，用返回值替换 / 追加到列表。
 *
 * 单文件模式直接替换整个列表；多文件模式追加，超出 `max` 的部分直接丢掉。
 * `@upload` 返回空（`null` / `undefined`）表示放弃该文件。
 *
 * @param target 原始文件；也支持 `FileList`
 * @returns 本次真正写进列表的文件项
 */
async function upload(target: File | ArrayLike<File>) {
  const raws = toFiles(target).filter(Boolean);
  if (!raws.length) return [];

  if (!Props.onUpload) {
    console.warn('[Upload] 未监听 @upload，无法上传');
    return [];
  }

  // 超出大小上限的先挑出去，不占名额
  const usable = raws.filter(raw => {
    if (Props.sizeLimit == null || raw.size <= Props.sizeLimit) return true;

    console.warn(`[Upload] ${raw.name} 超过 ${toMB(Props.sizeLimit)} MB 限制`);
    return false;
  });

  if (!usable.length) return [];

  // 单文件模式只取第一个（替换）；多文件模式只取还装得下的数量
  const accepted = usable.slice(0, Props.multiple ? remaining() : 1);

  if (!accepted.length) {
    console.warn(`[Upload] 最多上传 ${Props.max} 个文件`);
    return [];
  }

  const added: Array<TUploadFileInfo> = [];

  for (const raw of accepted) {
    const info = await Props.onUpload(raw);
    if (!info) continue;

    const next: TUploadFileInfo = {
      ...info,
      id: info.id ?? createId(),
      name: info.name ?? raw.name,
      size: info.size ?? raw.size
    };

    added.push(next);
    change(Props.multiple ? [...list.value, next] : [next]);
  }

  return added;
}

/**
 * 删除：先问 `@delete`，返回 `true`（或没监听）才从列表移除。
 *
 * `deleteRemote` 为 `false` 时只移除本地记录，不调 `@delete`。
 *
 * @param target 要删除的文件项
 * @returns 是否真的移除了
 */
async function remove(target: TUploadFileInfo) {
  if (Props.deleteRemote && Props.onDelete) {
    const allowed = await Props.onDelete(target);
    if (!allowed) return false;
  }

  change(list.value.filter(item => !isSameFile(item, target)));
  return true;
}

/** 文件选择框变化：拿到文件后立刻清空，保证同一个文件能重复选 */
function handleInputChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const raws = Array.from(input.files ?? []);
  input.value = '';

  if (raws.length) upload(raws);
}

function handleDragEnter(event: DragEvent) {
  if (!Props.drag) return;

  event.preventDefault();
  dragDepth += 1;
  dragging.value = true;
}

function handleDragOver(event: DragEvent) {
  if (!Props.drag) return;

  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
}

function handleDragLeave(event: DragEvent) {
  if (!Props.drag) return;

  event.preventDefault();
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) dragging.value = false;
}

function handleDrop(event: DragEvent) {
  if (!Props.drag) return;

  event.preventDefault();
  dragDepth = 0;
  dragging.value = false;

  const raws = Array.from(event.dataTransfer?.files ?? []);
  if (raws.length) upload(raws);
}

defineExpose({
  /** 打开文件选择框 */
  open,
  /** 上传原始文件 */
  upload,
  /** 删除文件项（走 `@delete` 判断） */
  remove,
  /** 与 `remove` 同名方法，方便按业务语义调用 */
  delete: remove,
  /** 直接替换列表（会触发 `@change`） */
  change
});
</script>

<style scoped>
.upload {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upload--dragging {
  outline: 1px dashed #18a058;
  outline-offset: 4px;
}

.upload--full .upload-trigger {
  cursor: not-allowed;
  opacity: 0.5;
}

.upload-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: fit-content;
  cursor: pointer;
  color: var(--font-color_1, #333);
}

.upload-input {
  display: none;
}

.upload-files {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.upload-file {
  display: flex;
  align-items: center;
  gap: 8px;
}

.upload-file-name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--font-color_1, #333);
}

.upload-file-remove {
  flex: none;
  padding: 0 2px;
  border: none;
  background: none;
  line-height: 1;
  cursor: pointer;
  color: #d03050;
}
</style>
