import type { Router } from "vue-router";

/** 路由表变化时的回调 */
export type TRouteTableChangeHandler = () => void;

/**
 * 每个 router 一份订阅者：路由表变了要通知的回调。
 *
 * `router.addRoute()` / `removeRoute()` 不派发任何事件，路由表在响应式系统里是「不可见」的 ——
 * 加完路由没有任何东西会通知到组件，watch 路由对象、watch 业务传进来的路由数组都不会触发
 * （`addRoute()` 只改 router 的路由表，根本不碰那个数组：引用没变、内容也没变）。
 *
 * 所以接管这两个方法：动过路由表就直接回调订阅者。
 */
const routeTableListeners: WeakMap<Router, Set<TRouteTableChangeHandler>> = new WeakMap();

/**
 * 订阅「路由表变了」：`addRoute()` / `removeRoute()` 之后回调 `Handler`。
 *
 * @param Router `useRouter()` 拿到的路由实例
 * @param Handler 变化时要做的事（通常是重建菜单）
 * @returns 注销函数，组件卸载时调
 */
export default function useRouteTableChange(Router: Router, Handler: TRouteTableChangeHandler): () => void {
  const Listeners: Set<TRouteTableChangeHandler> = routeTableListeners.get(Router) ?? new Set<TRouteTableChangeHandler>();
  routeTableListeners.set(Router, Listeners);
  Listeners.add(Handler);

  // 这个 router 第一次被订阅时接管那两个方法（之后再订阅就复用已经接管好的）
  if (Listeners.size === 1) {
    takeOverRouteTable(Router, () => Listeners.forEach(Listener => Listener()));
  }

  return () => {
    Listeners.delete(Handler);
  };
}

/**
 * 接管 `addRoute` / `removeRoute`：原方法照常调用，动过路由表就 `Notify()`。
 *
 * 不还原 —— 接管只影响这两个方法「顺带通知一下」，业务照常调用，
 * 还原反而会让还活着的订阅者收不到通知。
 */
function takeOverRouteTable(Router: Router, Notify: () => void): void {
  // addRoute / removeRoute 都是重载方法，这里绕开重载签名的类型校验（参数照原样透传）
  const RouterMethods = Router as unknown as {
    addRoute: (...args: any[]) => (() => void) | undefined,
    removeRoute: (...args: any[]) => void
  };
  const OriginAddRoute: (...args: any[]) => (() => void) | undefined = RouterMethods.addRoute.bind(Router);
  const OriginRemoveRoute: (...args: any[]) => void = RouterMethods.removeRoute.bind(Router);

  RouterMethods.addRoute = (...args: any[]) => {
    const Remove: (() => void) | undefined = OriginAddRoute(...args);
    Notify();

    return Remove;
  };
  RouterMethods.removeRoute = (...args: any[]) => {
    OriginRemoveRoute(...args);
    Notify();
  };
}
