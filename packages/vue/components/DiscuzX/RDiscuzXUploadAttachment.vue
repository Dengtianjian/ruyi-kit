<template>
  <RNaiveUpload v-bind="$attrs" :upload-file="uploadPostAttachment" :remove-file="removePostAttachment" />
</template>

<script lang="ts" setup>
import RNaiveUpload from '../Naive/RNaiveUpload.vue';
import { UploadFileInfo } from 'naive-ui';
import { DiscuzXAttachmentsApi } from '../../api/discuzX/common/DiscuzXAttachmentsApi';

const Props = defineProps<{
  action: string
}>();

const AApi = new DiscuzXAttachmentsApi(null, Props.action);

function uploadPostAttachment(file: UploadFileInfo): Promise<UploadFileInfo> {
  return AApi.uploadAttachment(file.file).then(res => {
    return {
      id: res.toString(),
      name: file.file.name,
      status: "finished",
      url: AApi.genAttachmentPreviewURL(res)
    };
  });
}

function removePostAttachment(file: UploadFileInfo) {
  return AApi.deleteAttachment(file.id).then(_ => {
    return true;
  });
}
</script>

<style scoped></style>