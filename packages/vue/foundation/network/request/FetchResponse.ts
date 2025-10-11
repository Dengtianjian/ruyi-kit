export type TFetchResponseHeader = Record<string, string>;

export default class FetchResponse {
  #statusCode: number = 200;
  #successfully: boolean = true;
  #failed: boolean = false;
  #headers: TFetchResponseHeader = {};
  #body: any = null;

  constructor(headers: TFetchResponseHeader, statusCode: number, body: any, success: boolean = true) {
    this.#successfully = success;
    this.#failed = !success;

    this.#headers = headers;
    this.#statusCode = statusCode;
    this.#body = body;
  }

  headers() {
    return this.#headers;
  }
  header(key: string, defaultValue: string = null) {
    return this.#headers[key] ?? defaultValue;
  }
  statusCode() {
    return this.#statusCode;
  }
  success() {
    return this.#successfully;
  }
  failed() {
    return this.#failed;
  }
  body() {
    return this.#body;
  }
}