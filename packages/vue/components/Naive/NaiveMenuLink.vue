<template>
  <a v-bind="Props">
    <slot />
  </a>
</template>

<script lang="ts" setup>
type HTMLAttributeReferrerPolicy = '' | 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url';

const Props = defineProps<{
  download?: any;
  href?: string | undefined;
  hreflang?: string | undefined;
  media?: string | undefined;
  ping?: string | undefined;
  rel?: string | undefined;
  target?: string | undefined;
  type?: string | undefined;
  referrerpolicy?: HTMLAttributeReferrerPolicy | undefined;
}>();
</script>

<style scoped></style>