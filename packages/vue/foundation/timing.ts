//* 节流 / 防抖：把连续触发的调用压成「一段时间内只真正执行一次」

/**
 * 被节流 / 防抖包装后的函数。
 *
 * 原函数是在「之后某个时刻」才执行的，调用处拿不到它的返回值 ——
 * 所以签名上返回 `void`，别指望 `const result = throttled()`。
 */
export type TTimedFunction<T extends (...args: any[]) => any> = ((...args: Parameters<T>) => void) & {
  /** 取消还没执行的那一次（防抖等待中的、节流尾部要补的） */
  cancel: () => void,

  /** 立刻执行还没执行的那一次；没有待执行的就不动 */
  flush: () => void,

  /** 是否还压着一次没执行 */
  pending: () => boolean
};

/** 节流配置 */
export interface IThrottleOptions {
  /** 窗口开始时就执行（默认 true） */
  leading?: boolean,

  /** 窗口结束时把期间最后一次调用补上（默认 true） */
  trailing?: boolean
}

/**
 * 防抖：每次调用都重新计时，静默 `Wait` 毫秒后才真正执行 —— 一连串调用只有最后一次算数。
 *
 * 适合「等停下来再做」的事：搜索输入、拖窗口结束后再重排布局。
 *
 * @param Fn 要执行的函数
 * @param Wait 静默时长（ms）
 * @param Immediate 首次调用是否立刻执行（尾部那次仍会补上，即 leading + trailing）
 * @returns 包装后的函数，带 `cancel` / `flush` / `pending`
 *
 * @example
 * const search = debounce(() => loadList(), 300);
 * input.addEventListener("input", search);
 */
export function debounce<T extends (...args: any[]) => any>(Fn: T, Wait: number = 0, Immediate: boolean = false): TTimedFunction<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const run = (): void => {
    timer = null;

    const Args: Parameters<T> = lastArgs ?? ([] as unknown as Parameters<T>);
    lastArgs = null;
    Fn(...Args);
  };

  const debounced = function (...args: Parameters<T>): void {
    lastArgs = args;

    if (timer) clearTimeout(timer);

    // 首次调用（此前没有等待中的定时器）先立刻执行一次
    if (Immediate && !timer) {
      run();
    }

    timer = setTimeout(run, Wait);
  } as TTimedFunction<T>;

  debounced.cancel = (): void => {
    if (timer) clearTimeout(timer);
    timer = null;
    lastArgs = null;
  };

  debounced.flush = (): void => {
    if (!timer) return;

    clearTimeout(timer);
    run();
  };

  debounced.pending = (): boolean => timer !== null;

  return debounced;
}

/**
 * 节流：不管触发多密，`Wait` 毫秒内最多执行一次 —— 中间的调用会被合并成窗口结束时的一次。
 *
 * 适合「持续发生但要限流」的事：滚动、resize 过程中也要有反馈，只是不能每帧都算。
 *
 * @param Fn 要执行的函数
 * @param Wait 间隔（ms）
 * @param Options `leading` 窗口开始就执行、`trailing` 窗口结束补最后一次，默认都开
 * @returns 包装后的函数，带 `cancel` / `flush` / `pending`
 *
 * @example
 * const onScroll = throttle(() => updatePosition(), 100);
 */
export function throttle<T extends (...args: any[]) => any>(Fn: T, Wait: number = 0, Options: IThrottleOptions = {}): TTimedFunction<T> {
  const Leading: boolean = Options.leading ?? true;
  const Trailing: boolean = Options.trailing ?? true;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const run = (): void => {
    const Args: Parameters<T> = lastArgs ?? ([] as unknown as Parameters<T>);
    lastArgs = null;
    Fn(...Args);
  };

  const throttled = function (...args: Parameters<T>): void {
    lastArgs = args;

    // 冷却中：只记下最新参数，等窗口结束再决定是否补一次
    if (timer) return;

    if (Leading) run();

    timer = setTimeout(() => {
      timer = null;

      // leading 已经执行过这一次了，trailing 关掉就别再补，否则同一次触发会跑两遍
      if (lastArgs && (!Leading || Trailing)) {
        run();
      } else {
        lastArgs = null;
      }
    }, Wait);
  } as TTimedFunction<T>;

  throttled.cancel = (): void => {
    if (timer) clearTimeout(timer);
    timer = null;
    lastArgs = null;
  };

  throttled.flush = (): void => {
    if (!timer) return;

    clearTimeout(timer);
    timer = null;

    if (lastArgs) run();
  };

  throttled.pending = (): boolean => timer !== null;

  return throttled;
}
