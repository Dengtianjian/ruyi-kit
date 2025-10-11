<template>
  <div class="r-space"
    :style="[gap ? { gap } : { columnGap, rowGap }, { justifyContent: justify, alignItems: align, flexWrap: wrap, flexDirection: direction }]">
    <slot />
  </div>
</template>

<script lang="ts" setup>
withDefaults(defineProps<{
  justify?: 'start' | 'end' | 'center' | 'space-around' | 'space-between' | 'space-evenly',
  align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch',
  wrap?: "nowrap" | "wrap" | "wrap-reverse" | string,
  gap?: number | string,
  rowGap?: number | string,
  columnGap?: number | string,
  direction?: string
}>(), {
  justify: "start",
  align: "start",
  warp: "nowrap",
  gap: "",
  rowGap: "",
  columnGap: '',
  direction: "row"
});
</script>

<style scoped>
.r-space {
  display: flex;
}
</style>