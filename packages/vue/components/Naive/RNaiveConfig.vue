<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-dialog-provider>
      <n-message-provider>
        <slot />
      </n-message-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>

<script lang="ts" setup>
import type { GlobalThemeOverrides} from 'naive-ui';
import { NConfigProvider, NDialogProvider, NMessageProvider } from "naive-ui";

withDefaults(defineProps<{
  themeOverrides?: GlobalThemeOverrides
}>(), {
  themeOverrides: {}
})

</script>

<style scoped></style>