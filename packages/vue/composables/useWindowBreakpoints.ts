import { computed, getCurrentInstance, onUnmounted, ref, watch } from "vue";
import type { ComputedRef, Ref } from "vue";
import { debounce, throttle } from "../foundation/timing";
import type { TTimedFunction } from "../foundation/timing";

/**
 * 断点命中方向：
 *
 * `max` —— 窗口宽度 <= 断点值时命中（窄屏优先，比如传 `768` 就是「手机 / 窄屏」）
 * `min` —— 窗口宽度 >= 断点值时命中（宽屏优先，比如传 `1200` 就是「桌面 / 宽屏」）
 */
export type TWindowBreakpointMode = "max" | "min";

/**
 * 断点：传什么形式，就按什么形式返回命中结果
 *
 * 单个值 —— 返回 `boolean`
 * 数组 —— 按下标一一对应，返回 `boolean[]`
 * 对象 —— 按名字一一对应，返回 `Record<string, boolean>`，比如 `{ mobile: 768, desktop: 1200 }`
 */
export type TWindowBreakpoints = number | number[] | Record<string, number>;

/**
 * 宽度更新的降频配置。
 *
 * 全局那份宽度本来就是按帧更新的（只是写一个数字，很便宜），
 * 真正贵的是「宽度变了 → 组件重渲染」，所以降频做在每个调用方自己的这一层。
 */
export interface IWindowBreakpointTiming {
  /** 间隔（ms）：不传或传 0 就是按帧走，一帧最多更新一次 */
  wait?: number,

  /** `wait > 0` 时的策略：节流（默认，拖动过程中持续有反馈）或防抖（停下来才更新） */
  strategy?: "throttle" | "debounce"
}

/**
 * 共享的窗口宽度：所有调用方都读这一份，避免每用一次就挂一个 `resize`。
 *
 * SSR（`window` 不存在）时保持 `null` —— 宽度未知，此时一律按「不命中」处理，
 * 免得服务端渲染时宽度算成 0 把 `max` 断点全命中了。
 */
const windowWidth: Ref<number | null> = ref(readWindowWidth());
let listenerCount: number = 0;
let frameHandle: number = 0;

/** 读当前窗口宽度；没有 `window`（SSR）就是 `null` */
function readWindowWidth(): number | null {
  return typeof window === "undefined" ? null : window.innerWidth;
}

/**
 * `resize` 拖窗口时能连续触发几十次，这里合并到下一帧只更新一次：
 * 中间那些帧的组件重渲染都是白算的。
 */
function onWindowResize(): void {
  if (frameHandle) return;

  frameHandle = requestAnimationFrame(() => {
    frameHandle = 0;
    windowWidth.value = readWindowWidth();
  });
}

/**
 * 挂上窗口监听：第一个调用方负责挂，最后一个卸载时摘掉。
 *
 * @returns 注销函数，组件里不用手动调（已在内部 `onUnmounted` 接管）
 */
function listenWindowWidth(): () => void {
  if (typeof window === "undefined") return () => {};

  listenerCount++;
  if (listenerCount === 1) {
    window.addEventListener("resize", onWindowResize);
    // 手机转屏、部分浏览器分屏也走 resize，但转屏在部分机型上会先派发 orientationchange
    window.addEventListener("orientationchange", onWindowResize);
  }

  return () => {
    listenerCount--;
    if (listenerCount > 0) return;

    listenerCount = 0;
    window.removeEventListener("resize", onWindowResize);
    window.removeEventListener("orientationchange", onWindowResize);

    // 已排队的那一帧也取消，不然都卸载了还会再写一次 ref
    if (frameHandle) {
      cancelAnimationFrame(frameHandle);
      frameHandle = 0;
    }
  };
}

/** 单个断点是否命中：宽度未知（SSR）一律不命中 */
function isHit(Width: number | null, Breakpoint: number, Mode: TWindowBreakpointMode): boolean {
  if (Width === null || !Number.isFinite(Breakpoint)) return false;

  return Mode === "min" ? Width >= Breakpoint : Width <= Breakpoint;
}

/**
 * 监听窗口宽度，逐个断点判断是否命中：命中为 `true`，没命中为 `false`。
 *
 * 多个断点各自独立判断（不是互斥的「当前处于哪个断点」），
 * 传 `[768, 1200]` 在 1400 宽的窗口上就是 `[false, true]`（`max` 模式）。
 *
 * @param Breakpoints 断点值（px）：单个值、数组（按下标对应）、对象（按名字对应）
 * @param Mode 命中方向，默认 `max`（宽度 <= 断点值算命中）
 * @returns 与传入形式一一对应的命中结果：传单个值就是 `boolean`，传数组 / 对象就是对应的集合
 *
 * @example
 * // 单个值：只关心一个断点
 * const isMobile = useWindowBreakpoints(768);
 *
 * @example
 * // 数组：窄屏隐藏侧栏、中屏收起表格列
 * const [isMobile, isTablet] = useWindowBreakpoints([768, 1200]);
 *
 * @example
 * // 对象：按名字取用，语义更清楚
 * const { mobile, desktop } = useWindowBreakpoints({ mobile: 768, desktop: 1200 }, "min");
 *
 * @example
 * // 重排很贵：每 200ms 最多更新一次
 * const [isMobile] = useWindowBreakpoints([768], "max", { wait: 200 });
 *
 * @example
 * // 停下来了才更新：适合拖动过程中根本没法看的场景
 * const [isMobile] = useWindowBreakpoints([768], "max", { wait: 300, strategy: "debounce" });
 */
export default function useWindowBreakpoints(Breakpoint: number, Mode?: TWindowBreakpointMode, Options?: IWindowBreakpointTiming): ComputedRef<boolean>;
export default function useWindowBreakpoints(Breakpoints: number[], Mode?: TWindowBreakpointMode, Options?: IWindowBreakpointTiming): ComputedRef<boolean[]>;
export default function useWindowBreakpoints(Breakpoints: Record<string, number>, Mode?: TWindowBreakpointMode, Options?: IWindowBreakpointTiming): ComputedRef<Record<string, boolean>>;
export default function useWindowBreakpoints(Breakpoints: TWindowBreakpoints, Mode: TWindowBreakpointMode = "max", Options: IWindowBreakpointTiming = {}): ComputedRef<boolean | boolean[] | Record<string, boolean>> {
  const StopListen: () => void = listenWindowWidth();

  const Wait: number = Options.wait ?? 0;
  const LocalWidth: Ref<number | null> = ref(windowWidth.value);
  let StopWatch: (() => void) | null = null;
  let CancelSync: (() => void) | null = null;

  if (Wait > 0) {
    const Sync: TTimedFunction<(value: number | null) => void> = Options.strategy === "debounce"
      ? debounce((Value: number | null) => { LocalWidth.value = Value; }, Wait)
      : throttle((Value: number | null) => { LocalWidth.value = Value; }, Wait);

    StopWatch = watch(windowWidth, (Value: number | null) => Sync(Value));
    CancelSync = Sync.cancel;
  }

  // 在组件里调用时自己接管注销；在组件外（比如别的函数里）调用就只能靠调用方自己管生命周期了
  if (getCurrentInstance()) {
    onUnmounted(() => {
      StopListen();
      StopWatch?.();
      CancelSync?.();
    });
  }

  return computed(() => {
    const Width: number | null = Wait > 0 ? LocalWidth.value : windowWidth.value;
    const match = (Breakpoint: number): boolean => isHit(Width, Breakpoint, Mode);

    // 传单个值就直接给一个 boolean，省得调用方再写 [0] 去取
    if (typeof Breakpoints === "number") {
      return match(Breakpoints);
    }

    if (Array.isArray(Breakpoints)) {
      return Breakpoints.map(match);
    }

    const Result: Record<string, boolean> = {};
    Object.keys(Breakpoints ?? {}).forEach(Key => {
      Result[Key] = match(Breakpoints[Key]);
    });

    return Result;
  });
}
