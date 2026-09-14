import type { ISSEMessage } from "./types";

/**
 * 按 SSE 规范把字节流切成一帧帧事件。
 * 规范细节：`\r\n` / `\n` / `\r` 都算换行；`:` 开头是注释（常用于心跳）；空行结束一帧；
 * 没有 `data` 的帧不派发；`id` 跨帧保留。
 *
 * 内部实现类，由 `SSEConnection` 持有，不对外导出。
 */
export class SSEParser {
  #decoder = new TextDecoder();
  #buffer = "";
  #event = "";
  #id = "";
  #data: string[] = [];

  push(chunk: Uint8Array): ISSEMessage[] {
    const messages: ISSEMessage[] = [];
    this.#buffer += this.#decoder.decode(chunk, { stream: true });

    while (true) {
      const cr = this.#buffer.indexOf("\r");
      const lf = this.#buffer.indexOf("\n");
      if (cr === -1 && lf === -1) break;

      if (cr !== -1 && (lf === -1 || cr < lf)) {
        // `\r` 落在末尾时可能是 `\r\n` 被切断了，留到下一块再判
        if (cr === this.#buffer.length - 1) break;
        const line = this.#buffer.slice(0, cr);
        this.#buffer = this.#buffer.slice(this.#buffer[cr + 1] === "\n" ? cr + 2 : cr + 1);
        this.#handleLine(line, messages);
      } else {
        const line = this.#buffer.slice(0, lf);
        this.#buffer = this.#buffer.slice(lf + 1);
        this.#handleLine(line, messages);
      }
    }

    return messages;
  }

  #handleLine(line: string, messages: ISSEMessage[]): void {
    if (line === "") {
      this.#dispatch(messages);
      return;
    }
    // 注释行（心跳）
    if (line[0] === ":") return;

    const index = line.indexOf(":");
    const field = index === -1 ? line : line.slice(0, index);
    let value = index === -1 ? "" : line.slice(index + 1);
    if (value[0] === " ") value = value.slice(1);

    switch (field) {
      case "event":
        this.#event = value;
        break;
      case "data":
        this.#data.push(value);
        break;
      case "id":
        this.#id = value;
        break;
      // `retry` 是服务端建议的重连间隔。重连节奏由调用方的 `reconnect` 配置决定
      // （后端 `ServerSentEvent` 也不输出这一行），所以这里不解析，只当未知字段忽略
      default:
        break;
    }
  }

  #dispatch(messages: ISSEMessage[]): void {
    if (this.#data.length) {
      messages.push({
        event: this.#event || "message",
        data: this.#data.join("\n"),
        id: this.#id
      });
    }
    this.#event = "";
    this.#data = [];
  }
}
