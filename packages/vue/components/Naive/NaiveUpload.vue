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

            <div class="image-card_delete-button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M6.2253 4.81108C5.83477 4.42056 5.20161 4.42056 4.81108 4.81108C4.42056 5.20161 4.42056 5.83477 4.81108 6.2253L10.5858 12L4.81114 17.7747C4.42062 18.1652 4.42062 18.7984 4.81114 19.1889C5.20167 19.5794 5.83483 19.5794 6.22535 19.1889L12 13.4142L17.7747 19.1889C18.1652 19.5794 18.7984 19.5794 19.1889 19.1889C19.5794 18.7984 19.5794 18.1652 19.1889 17.7747L13.4142 12L19.189 6.2253C19.5795 5.83477 19.5795 5.20161 19.189 4.81108C18.7985 4.42056 18.1653 4.42056 17.7748 4.81108L12 10.5858L6.2253 4.81108Z"
                  fill="currentColor" />
              </svg>
            </div>

            <!-- <div class="image-card_actions">
              <div class="image-card_action-item">

              </div>
            </div> -->
          </li>
        </ul>
      </slot>
    </template>
  </Upload>
</template>

<script lang="ts" setup>
import { TUploadFileInfo } from '../../types/upload.js';
import Upload from '../Base/Upload/Upload.vue';

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
  width: 94px;
  height: 94px;
  border: 1px solid #f3f3f3;
  border-radius: 4px;
}

.image-card-list>li img {
  display: block;
  width: 100%;
}

.image-card_upload-percentage {
  position: absolute;
  bottom: 0px;
  left: 0px;
  width: 50%;
  height: 2px;
  background-color: rgba(0, 0, 0, .65);
}

.image-card_delete-button {
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  z-index: 10;
  top: -10px;
  right: -10px;
  width: 20px;
  height: 20px;
  color: white;
  visibility: hidden;
  cursor: pointer;
  background: rgba(0, 0, 0, .65);
  border-radius: 50%;
  -moz-box-pack: center;
  -moz-box-align: center;
}

.image-card-list>li:hover .image-card_delete-button {
  visibility: visible;
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