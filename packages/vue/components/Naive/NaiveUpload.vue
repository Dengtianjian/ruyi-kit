<template>
  <n-upload
    :list-type="listType"
    :max="Max"
    :file-list="FileList"
    @change="uploadFile"
    @remove="removeFile"
    v-bind="$attrs"
  >
    <slot />
  </n-upload>
</template>

<script lang="ts" setup>
import { UploadFileInfo, useMessage } from "naive-ui";
import { reactive, ref, watch } from "vue";

const NMessage = useMessage();

const Props = withDefaults(
  defineProps<{
    files?: Array<UploadFileInfo>;
    file?: UploadFileInfo;
    single?: boolean;
    uploadFile: (file: UploadFileInfo) => Promise<string | UploadFileInfo>;
    removeFile?: (file: UploadFileInfo) => Promise<boolean>;
    max?: number;
    listType?: "text" | "image" | "image-card";
    onlyUpload?: boolean;
    sizeLimit?: number;
  }>(),
  {
    files: null,
    file: null,
    single: false,
    max: 1,
    listType: "text",
    onlyUpload: false,
    sizeLimit: null,
  }
);

const Max = ref<number>(Props.max);
watch(
  () => Props.max,
  (newV) => {
    if (Props.single) {
      Max.value = 1;
    } else {
      Max.value = newV;
    }
  }
);
watch(
  () => Props.single,
  (newV) => {
    if (newV) {
      Max.value = 1;
    } else {
      Max.value = Props.max;
    }
  }
);

const FileList = reactive([]);
if (!Props.onlyUpload) {
  if (Props.files) {
    FileList.push(...Props.files);
  } else if (Props.file) {
    FileList.push(Props.file);
  }
}

const Emits = defineEmits(["update:file", "update:files"]);

function uploadFile({
  file,
}: {
  file: UploadFileInfo;
  fileList: Array<UploadFileInfo>;
  event?: Event;
}) {
  if (file.file) {
    if (Props.sizeLimit && file.file.size > Props.sizeLimit) {
      return NMessage.warning(
        `请上传不超过 ${Math.round(Props.sizeLimit / 1024 / 1024)} MB的文件`
      );
    }

    Props.uploadFile(file)
      .then((res) => {
        if (typeof res === "string") {
          if (Props.single === true || Props.single === undefined) {
            if (Props.onlyUpload) {
              Emits("update:file", {
                id: file.id,
                name: file.name,
                status: "finished",
                url: res,
              });
            } else {
              FileList.splice(0, 1, {
                id: file.id,
                name: file.name,
                status: "finished",
                url: res,
              });
              Emits("update:file", FileList[0]);
            }
          } else {
            if (!Props.onlyUpload) {
              FileList.push({
                id: file.id,
                name: file.name,
                status: "finished",
                url: res,
              });
            }
            Emits("update:files", FileList);
          }
        } else {
          if (Props.single === true || Props.single === undefined) {
            !Props.onlyUpload && FileList.splice(0, 1, res);
            Emits("update:file", res);
          } else {
            if (!Props.onlyUpload) {
              FileList.push(res);
            }
            Emits("update:files", FileList);
          }
        }
      })
      .catch((err) => {
        NMessage.error(err.message ?? "上传失败，请稍后重试");
      });
  } else {
    NMessage.warning("请选择上传的文件");
  }
}

function removeFile({ file }: { file: UploadFileInfo }) {
  return new Promise((resolve, reject) => {
    if (Props.removeFile) {
      Props.removeFile(file).then(resolve).catch(reject);
    } else {
      resolve(true);
    }
  })
    .then(() => {
      FileList.splice(
        FileList.findIndex((item) => {
          return item.id === file.id;
        }),
        1
      );
      if (Props.single) {
        Emits("update:file", null);
      } else {
        Emits("update:files", FileList);
      }
    })
    .catch((err) => {
      if (err.statusCode === 404) {
        FileList.splice(
          FileList.findIndex((item) => {
            return item.id === file.id;
          }),
          1
        );
        if (Props.single) {
          Emits("update:file", null);
        } else {
          Emits("update:files", FileList);
        }
        return true;
      }
      NMessage.error(err.message ?? "删除失败，请稍后重试");
      return false;
    });
}

watch(
  () => Props.file,
  (newV) => {
    FileList.splice(0);
    if (newV) {
      FileList.push(Props.file);
    }
  }
);
</script>

<style scoped></style>
