<template>
  <div class="panel">
    <div class="panel-header" v-if="title || $slots.title || $slots.extra">
      <div class="panel-header-title">
        <slot name="title" />
        {{ title }}
      </div>
      <div class="panel-heaer-extra">
        <slot name="extra" />
      </div>
    </div>
    <div class="panel-body" :style="{
      marginTop: title || $slots.title || $slots.extra ? '10px' : 'unset'
    }">
      <slot />
    </div>
  </div>
</template>

<script lang="ts" setup>
defineProps({
  title: String
});
</script>

<style scoped>
.panel {
  padding: var(--r-panel-padding);
  background-color: var(--r-panel-background-color);
  border-radius: var(--r-border-radius);
  box-sizing: border-box;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header-title {
  font-size: 16px;
  color: var(--font-color_1);
  font-weight: bold;
}
</style>