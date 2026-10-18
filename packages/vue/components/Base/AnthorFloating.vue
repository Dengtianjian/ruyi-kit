<template>
  <div class="float-container" :style="PositionStyle" ref="FloatContainerEl">
    <slot />
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref, useTemplateRef, watch, watchPostEffect } from 'vue';

const Props = withDefaults(defineProps<{
  target: HTMLElement | null,
  xPosition?: "left" | "right",
  left?: number,
  right?: number,
  top?: string | number,
  bottom?: string | number,
  zIndex?: number
}>(), {
  xPosition: 'left',
  zIndex: 9
});

const FloatContainerEl = useTemplateRef("FloatContainerEl");

/**
 * 缓冲区距离，避免浏览器缩放的时候碰到元素或者由于 window.innerWidth 没计算滚动条的宽度导致元素被覆盖了
 * 增加和这个参数为了浏览器边界快触碰到的时候重计算
 */
const BufferDistance = 30;
const PositionStyle = ref<Record<string, string | number>>({
  position: 'fixed',
  zIndex: Props.zIndex
});

function getParentOffsetLeftAndTop(Target: HTMLElement | null): {
  top: number,
  left: number
} {
  if (!Target) return {
    top: 0,
    left: 0
  };

  const Offsets = {
    top: Target?.offsetTop || 0,
    left: Target?.offsetLeft || 0,
  };

  if (Target.offsetParent !== document.body) {
    const { left, top } = getParentOffsetLeftAndTop(Target.offsetParent as HTMLElement);
    Offsets.top += top;
    Offsets.left += left;
  }

  return Offsets;
}
function recalcPosition() {
  if (!Props.target) return;
  if (!FloatContainerEl.value) return;

  const { left: OffsetLeft } = getParentOffsetLeftAndTop(Props.target);

  if (Props.top) {
    PositionStyle.value.top = typeof Props.top === 'number' ? `${Props.top}px` : Props.top;
  }
  if (Props.bottom) {
    PositionStyle.value.bottom = typeof Props.bottom === 'number' ? `${Props.bottom}px` : Props.bottom;
  }

  if (Props.xPosition === 'left') {
    if (!Props.left) {
      console.error("AnthorFloating 组件缺失 left 参数");
      return;
    }
    if (Props.right !== undefined) PositionStyle.value.right = `${Props.right}px`;

    const PropLeft = Props.left;

    let left = Props.target.offsetWidth + OffsetLeft + PropLeft;

    if (window.innerWidth <= left + FloatContainerEl.value.clientWidth + BufferDistance) {
      left = Props.target.offsetWidth + OffsetLeft - PropLeft;

      left -= BufferDistance;
    }

    PositionStyle.value.left = `${left}px`;

  } else {
    if (!Props.right) {
      console.error("AnthorFloating 组件缺失 right 参数");
      return;
    }
    if (Props.left !== undefined) PositionStyle.value.left = `${Props.left}px`;

    const PropRight = Props.right ?? 0;

    let right = Props.target.offsetWidth + OffsetLeft + PropRight;

    if (window.innerWidth <= right + FloatContainerEl.value.clientWidth + BufferDistance) {
      right = Props.target.offsetWidth + OffsetLeft - PropRight;

      right -= BufferDistance;
    }

    PositionStyle.value.right = `${right}px`;
  }
}

watch(() => Props, recalcPosition, {
  deep: true
});

onMounted(() => {
  recalcPosition();

  window.addEventListener("resize", recalcPosition);
  onUnmounted(() => {
    window.removeEventListener("resize", recalcPosition);
  });
});
</script>

<style scoped></style>