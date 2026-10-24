<template>
  <div class="copy" :class="{
    'copy-icon': showIcon
  }" @click="copyContent" title="点击复制内容">
    <slot />
    <i class="antd antd-file-copy" v-if="showIcon"></i>
  </div>
</template>

<script lang="ts" setup>
const Props = withDefaults(defineProps<{
  content: string,
  showIcon?: boolean
}>(), {
  showIcon: true
});

const Emits = defineEmits(["success", "fail"]);

function copyContent() {
  navigator.clipboard.writeText(Props.content).then(() => {
    Emits("success");
  }).catch(err => {
    Emits("fail", err);
  });
}
</script>

<style scoped>
.copy {
  cursor: pointer;
}

.copy-icon {
  display: flex;
  align-items: center;
  column-gap: 5px;
}

.copy-icon i {
  color: #ccc;
}
</style>