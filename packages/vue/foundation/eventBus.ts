//* 事件总线、任务巴士

/**
 * 极简事件总线：按频道名（字符串）收发，`List` 就是「频道名 → 订阅者数组」。
 *
 * 三个动作：
 * - `distribute(name).complete(...)` —— 派发
 * - `subscribe(name, callback)` —— 订阅，返回的 `cancel()` 可取消
 * - `once(name, callback)` —— 一次性订阅，首次派发后自动移除
 *
 * 已知限制（都来自「按下标删除 + 直接遍历数组」这个实现方式），用之前先看一眼：
 * - **不做错误处理**：某个回调抛错，这一轮排在它后面的订阅者就收不到了；
 * - **`cancel()` 按下标删除**：前面的人先取消会让后面订阅者的下标整体前移，
 *   于是后取消的人可能删掉别人的回调 —— 只有「订阅顺序与取消顺序一致」时才可靠；
 * - **`once` 会在派发过程中改写数组**：它把自己 `splice` 掉之后，同一轮 `forEach`
 *   会跳过排在它后面的订阅者（那一轮它们收不到）；
 * - **频道永不清空**：没人订阅的空数组也留在 `List` 里，频道名多了要注意这个只增不减的表。
 */

type TSubscribers = Array<(...params: any[]) => void>;

const List: Map<string, TSubscribers> = new Map();

export default {
  /**
   * 取某个频道的派发器：`complete(...params)` 就是把参数原样挨个喂给当前所有订阅者。
   *
   * 为什么不直接 `distribute(name, ...params)`：任务巴士的用法是**先拿到句柄、完成时再派发**，
   * 订阅方不必知道任务什么时候结束。句柄可以多次 `complete`，每次都是一轮完整派发。
   *
   * 频道不存在时会顺手建一个空数组，所以拿到句柄就一定有频道，没人订阅时派发等于空转。
   */
  distribute(name: string): {
    complete: (...params: any[]) => void
  } {
    if (!List.has(name)) {
      List.set(name, []);
    }

    return {
      complete: (...params) => {
        const callbacks = List.get(name);
        callbacks.forEach((item) => {
          item(...params);
        });
      }
    };
  },
  /**
   * 订阅频道，回调按**订阅顺序**依次触发，派发参数原样透传。
   *
   * 返回的 `cancel()` 只删自己这一个回调；重复调用会误删后面的订阅者（见文件头的下标限制），
   * 所以取消动作本身也应该只做一次。
   */
  subscribe(name: string, callback: (...params: any[]) => void): {
    cancel: () => void
  } {
    if (!List.has(name)) {
      List.set(name, []);
    }
    const list = List.get(name);
    // push 返回新长度，回调自己的下标是长度 - 1；cancel 时按这个位置删（不是按回调身份删）
    const index: number = list.push(callback) - 1;

    return {
      cancel() {
        list.splice(index, 1);
      }
    }
  },
  /**
   * 一次性订阅：第一次派发后自动移除，之后的派发不再触发。
   *
   * 适合「某个动作完成时提示一次」这类场景；同样按下标移除，
   * 并且会跳过同一轮里排在它后面的订阅者（见文件头）。
   */
  once(name: string, callback: (...params: any[]) => void): void {
    if (!List.has(name)) {
      List.set(name, []);
    }

    const list = List.get(name);
    const index: number = list.push((...params) => {
      callback(...params);
      list.splice(index - 1, 1);
    });
  }
}
