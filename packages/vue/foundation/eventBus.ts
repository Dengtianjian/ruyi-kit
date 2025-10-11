//* 事件总线、任务巴士

type TSubscribers = Array<(...params) => void>;

const List: Map<string, TSubscribers> = new Map();

export default {
  distribute(name: string): {
    complete: (...params) => void
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
  subscribe(name: string, callback: (...params) => void): {
    cancel: () => void
  } {
    if (!List.has(name)) {
      List.set(name, []);
    }
    const list = List.get(name);
    const index: number = list.push(callback) - 1;

    return {
      cancel() {
        list.splice(index, 1);
      }
    }
  },
  once(name: string, callback: (...params) => void): void {
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