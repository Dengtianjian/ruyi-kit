<template>
  <n-tabs v-bind="$attrs" v-model:value="DefaultSelectedTab" @update:value="tabValueUpdate">
    <slot />
  </n-tabs>
</template>

<script lang="ts" setup>
import { useRoute, useRouter } from "vue-router";
import { MenuOption } from "naive-ui";
import { ref } from "vue";

const Route = useRoute();
const Router = useRouter();

let selectedMenu: MenuOption & {
  childrenNames?: string[]
} = null;
const DefaultSelectedTab = ref<string>(Route.name.toString());

Router.beforeResolve((to, from, next) => {
  DefaultSelectedTab.value = to.name?.toString();
  if (selectedMenu?.childrenNames && selectedMenu.childrenNames.includes(to.name.toString())) {
    DefaultSelectedTab.value = selectedMenu.key.toString();
  }
  next();
});

function tabValueUpdate(key: string) {
  DefaultSelectedTab.value = key;
  Router.replace({
    name: key
  });
}
</script>

<style scoped></style>