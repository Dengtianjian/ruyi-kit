<template>
  <router-view v-slot="{ Component, route }">
    <keep-alive v-if="route.meta.cache">
      <component :is="Component" ></component>
    </keep-alive>
    <component :is="Component" v-else></component>
  </router-view>
</template>

<script lang="ts" setup>
</script>

<style scoped></style>