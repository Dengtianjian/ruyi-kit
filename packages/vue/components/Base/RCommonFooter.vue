<template>
  <footer class="common-footer">{{ version }} <a href="mailto:mail@isdtj.com">联系我们</a>
  </footer>
</template>

<script lang="ts" setup>
import { version } from "../../../../../package.json";
</script>

<style scoped>
.common-footer {
  margin: 40px 0 20px;
  text-align: center;
  color: var(--font-light-color);
  user-select: none;
}
</style>