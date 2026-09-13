<template>
  <n-config-provider abstract :locale="zhCN" :date-locale="dateZhCN"
    :theme="Theme === 'light' ? lightTheme : darkTheme">
    <n-message-provider>
      <slot />
    </n-message-provider>
  </n-config-provider>
</template>

<script lang="ts" setup>
import { NConfigProvider, NMessageProvider, zhCN, dateZhCN, darkTheme, lightTheme, useOsTheme } from "naive-ui";
import type { ThemeCommonVars, GlobalThemeOverrides } from "naive-ui";
import { ref, watch } from "vue";

type TTheme = 'dark' | 'light';

const Props = withDefaults(defineProps<Partial<{
  autoSwitchColorMode: boolean,
  config: Partial<{
    theme: ThemeCommonVars,
    themeOverrides: GlobalThemeOverrides
  }>
}>>(), {
  autoSwitchColorMode: false
});

const ColorMode = defineModel<TTheme>("colorMode", {
  default: "light"
});
const Theme = ref<TTheme>('light');
function updateTheme() {
  const OSTheme = useOsTheme().value || 'light';
  if (Props.autoSwitchColorMode) {
    ColorMode.value = OSTheme;
    Theme.value = OSTheme;
  } else {
    Theme.value = ColorMode.value;
  }
}
watch(() => Props.autoSwitchColorMode, updateTheme);
watch(() => ColorMode.value, NewV => {
  if (Props.autoSwitchColorMode) {
    ColorMode.value = useOsTheme().value || 'light';
  } else {
    Theme.value = NewV;
  }
});
updateTheme();
</script>

<style scoped></style>