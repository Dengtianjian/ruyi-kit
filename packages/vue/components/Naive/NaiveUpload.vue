<template>
  <Upload v-bind="$attrs" :files="files" :file="file">
    <template #trigger>
      <slot name="trigger">
        <n-button>上传</n-button>
      </slot>
    </template>
    <template #="{ files, upload, remove, dragging }">
      <slot :files="files" :upload="upload" :remove="remove" :dragging="dragging">
        <ul class="image-card-list">
          <li v-for="file in files" :key="file.id">
            <img :src="file.thumbnailUrl || file.url" />
            <div class="image-card_upload-percentage"></div>

            <div class="image-card_actions">
              <div class="image-card_action-item"> 删除</div>
            </div>
          </li>
        </ul>
      </slot>
    </template>
  </Upload>
</template>

<script lang="ts" setup>
import { TUploadFileInfo } from '../../types/upload.js';
import Upload from '../Base/Upload/Upload.vue';
import { NIcon } from 'naive-ui';

/** 单文件：始终是 `files` 的第一个 */
const file = defineModel<TUploadFileInfo | null>('file', { default: null });
/** 文件列表 */
const files = defineModel<Array<TUploadFileInfo>>('files', { default: () => [] });
</script>

<style scoped>
.image-card-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.image-card-list>li {
  position: relative;
  border: 1px solid #f3f3f3;
  border-radius: 4px;
}

.image-card_upload-percentage {
  position: absolute;
  bottom: 0px;
  left: 0px;
  width: 100%;
  height: 2px;
  background-color: red;
}

.image-card_actions {
  display: flex;
  column-gap: 5px;
  justify-content: center;
  position: absolute;
  bottom: 10px;
  left: 0px;
  right: 0px;
  max-width: 90%;
  padding: 4px 6px;
  margin: 0 auto;
  color: white;
  background-color: rgba(0, 0, 0, 0.8);
  border-radius: 15px;
  box-sizing: border-box;
}

.image-card_action-item {}
</style>