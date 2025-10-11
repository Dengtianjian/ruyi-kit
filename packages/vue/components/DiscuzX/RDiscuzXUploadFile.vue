<template>
  <RNaiveUpload :upload-file="uploadFile" :remove-file="removeFile" />
</template>

<script lang="ts" setup>
import RNaiveUpload from '../Naive/RNaiveUpload.vue';
import { UploadFileInfo, useMessage } from 'naive-ui';
import DiscuzXFilesApi from '../../api/discuzX/common/DiscuzXFilesApi';

const NMessage = useMessage();

const Props = withDefaults(defineProps<{
  pathName: string
  action: string
}>(), {
  pathName: "files"
});

DiscuzXFilesApi.url(Props.action);

function uploadFile(file: UploadFileInfo): Promise<UploadFileInfo> {
  return DiscuzXFilesApi.getUploadAuth(file.name, Props.pathName, file.file.size).then(UploadAuth => {
    for (const key in UploadAuth.auth) {
      DiscuzXFilesApi.query(key, UploadAuth.auth[key]);
    }
    return DiscuzXFilesApi.uploadFile(UploadAuth.fileKey, file.file);
  }).then(res => {
    return {
      id: res.key,
      name: res.name,
      status: "finished",
      url: res.previewURL
    };
  }).catch(err => {
    NMessage.error(err.message ?? "获取文件上传授权失败");
  });
}

function removeFile(file: UploadFileInfo) {
  return DiscuzXFilesApi.deleteFile(file.id).then(_ => {
    return true;
  });
}
</script>

<style scoped></style>