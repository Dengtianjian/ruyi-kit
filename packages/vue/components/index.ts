/**
 * 组件出口：一个目录一组，导出名就是文件名（`Base/Space.vue` → `Space`）。
 *
 * 这里只做转发，组件的 props / 事件看各自文件。
 * 新增组件时在这里补一行：`.vue` 没有可枚举的具名导出，`export *` 用不了，
 * 只能用 `export { default as X } from "./X.vue"` 显式列出。
 */

/* ------------------------------------ 基础组件 ------------------------------------ */

/** 悬浮容器：贴着 `target` 定位，可指定左右与上下偏移、层级 */
export { default as AnthorFloating } from "./Base/AnthorFloating.vue";
/** 点击即可复制的文本 */
export { default as CopyText } from "./Base/CopyText.vue";
/** 按 `route.meta.cache` 决定是否 keep-alive 的 router-view */
export { default as KeepAliveRouterView } from "./Base/KeepAliveRouterView.vue";
/** 面板容器：标题栏（含右上角操作区）+ 内容插槽 */
export { default as Panel } from "./Base/Panel.vue";
/** flex 间距容器：统一 gap / 对齐 / 换行 */
export { default as Space } from "./Base/Space.vue";
/** 列表底部状态：下拉加载更多 / 加载中 / 已加载完 */
export { default as Status } from "./Base/Status.vue";

/* ----------------------------------- Naive UI ----------------------------------- */

/** 双栏布局：左侧路由菜单 + 右侧内容，栏宽可配 */
export { default as NativeTwoColumnLayout } from "./Naive/Layout/NativeTwoColumnLayout.vue";
/** 全局 naive-ui 配置：主题覆盖 + dialog / message provider */
export { default as NaiveConfig } from "./Naive/NaiveConfig.vue";
/** `n-form-item` 的封装：统一 feedback 插槽 */
export { default as NaiveFormItem } from "./Naive/NaiveFormItem.vue";
/** 外链图标链接：把菜单项包成 `<a>` */
export { default as NaiveMenuLink } from "./Naive/NaiveMenuLink.vue";
/** naive-ui provider：语言、亮暗主题与 message */
export { default as NaiveProvider } from "./Naive/NaiveProvider.vue";
/** 路由驱动的菜单：按路由表或 `menus` 生成 `n-menu` 选项，并跟随路由高亮 */
export { default as NaiveRouterMenu } from "./Naive/NaiveRouterMenu.vue";
/** 路由驱动的 tabs */
export { default as NaiveRouterTabs } from "./Naive/NaiveRouterTabs.vue";
/** `n-upload` 的封装：接上传 / 删除回调与数量、大小限制 */
export { default as NaiveUpload } from "./Naive/NaiveUpload.vue";
/** 居中的分页条 */
export { default as NativeCenterPagination } from "./Naive/NativeCenterPagination.vue";
/** 居中的分页条 */
export { default as NaiveCenterPagination } from "./Naive/NaiveCenterPagination.vue";
