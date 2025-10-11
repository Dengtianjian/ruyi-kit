<template>
  <view class="r-status" :style="{
    '--font-size': fontSize
  }">
    <view class="r-status_loading-icon" v-if="loadingIcon && loading" :style="{
      '--icon-color': iconColor,
      '--icon-active-color': iconActiveColor
    }">
      <view class="r-status_loading-icon-el {{ activeIndex===0?'r-status_loading-icon-el_active':'' }}"></view>
      <view class="r-status_loading-icon-el {{ activeIndex===1?'r-status_loading-icon-el_active':'' }}"></view>
      <view class="r-status_loading-icon-el {{ activeIndex===2?'r-status_loading-icon-el_active':'' }}"></view>
    </view>
    {{ loading ? loadingText : finished ? finishedText : defaultText }}
  </view>
</template>

<script lang="ts" setup>
const Props = withDefaults(defineProps<{
  defaultText?: string,
  loading?: boolean,
  loadingText?: string,
  loadingIcon?: boolean,
  iconColor?: string,
  iconActiveColor?: string,
  fontSize?: string,
  finished?: boolean,
  finishedText?: string
}>(), {
  defaultText: "下拉加载更多",
  loading: false,
  loadingText: "加载中",
  loadingIcon: true,
  iconColor: "#999",
  iconActiveColor: "#333",
  fontSize: "14px",
  finished: false,
  finishedText: "没有更多了"
});

const ActiveIndex = ref<number>(0);

let loadingAnimationTimer = null;
function startLoadingAnimation() {
  loadingAnimationTimer = setInterval(() => {
    ActiveIndex.value = ActiveIndex.value === 2 ? 0 : ActiveIndex.value + 1;
  }, 200);
}

watch(() => Props.loading, (newV) => {
  if (newV && Props.loadingIcon) {
    startLoadingAnimation();
  }

  if (!newV) {
    loadingAnimationTimer && clearInterval(loadingAnimationTimer), loadingAnimationTimer = null;
  }
});

onMounted(() => {
  startLoadingAnimation();
});
</script>

<style scoped>
.r-status {
  --font-size: 28rpx;

  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 20rpx;
  padding: 8rpx 0;
  min-height: 100rpx;
  color: #999;
  font-size: var(--font-size);
  box-sizing: border-box;
}

.r-status_loading-icon {
  display: flex;
  align-items: center;
  column-gap: 4rpx;
}

.r-status_loading-icon-el {
  width: 10rpx;
  height: 10rpx;
  background-color: var(--icon-color);
  border-radius: 50%;
}

.r-status_loading-icon-el_active {
  background-color: var(--icon-active-color);
}
</style>