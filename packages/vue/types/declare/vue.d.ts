/**
 * `.vue` 单文件组件的模块声明。
 *
 * `tsc` 不认识 SFC，而 `kit/vue` 的入口又从 `components/index.ts` 转发了 `.vue` 组件，
 * 没有这份声明时纯 `tsc` 会对每个 `.vue` 导入报 TS2307。
 *
 * 这里只保证「能解析到模块」，组件的真实 props / 事件类型由编辑器（Volar / vue-tsc）提供。
 */
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
