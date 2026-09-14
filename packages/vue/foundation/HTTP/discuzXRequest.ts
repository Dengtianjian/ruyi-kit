import type { TBody, THTTPMiddleware, TMethods } from ".";
import RuyiRequest from "./RuyiRequest";

export default class extends RuyiRequest {
  constructor(prefix: string = null, baseUrl: string = null, method: TMethods = "GET", query: Record<string, number | string | boolean> = {}, body: TBody = null, transforms: string[] = [], options: RequestInit = {}, headers: Record<string, string> = {}, globalMiddlewares: Array<THTTPMiddleware> = []) {
    super(prefix, baseUrl, method, query, body, transforms, options, headers, globalMiddlewares);
  }
  generateRequestUrl(baseUrl: string, uri: string | number | (string | number)[], query?: Record<string, string | number>): string {
    uri = uri ?? [];
    let queryString: string = "";

    if (baseUrl.includes("?")) {
      const uris = baseUrl.split("?");
      uris[1].split("&").map(item => item.split("=")).forEach(item => {
        if (!query[item[0]]) {
          query[item[0]] = item[1];
        }
      });
      baseUrl = baseUrl.substring(0, baseUrl.lastIndexOf("?"));
    }

    let queryGroup: string[] = [];
    for (const key in query) {
      queryGroup.push(`${key}=${query[key]}`);
    }
    queryString = queryGroup.join("&");

    return `${baseUrl}?${queryString}`;
  }
  send<ResponseData>(uri: string | number | (string | number)[] = null, method: TMethods = null): Promise<ResponseData> {

    let uris = [];
    if (uri) {
      if (Array.isArray(uri)) {
        uris.push(...uri);
      } else {
        uris.push(uri);
      }
    }

    if (this.requestPrefix) {
      if (Array.isArray(this.requestPrefix)) {
        uris.unshift(...this.requestPrefix);
      } else {
        uris.unshift(this.requestPrefix);
      }
    }

    this.query("uri", uris ? uris.join("/") : "/");
    // this.prefix(null);

    return super.send<ResponseData>(null, method);
  }
  /**
   * 发送GET请求
   * @param uri URI
   * @returns Promise
   */
  get<ResponseData>(uri: string | string[], query: Record<string, number | string> = null) {
    if (query) {
      for (const key in query) {
        this.query(key, query[key]);
      }
    }

    return this.send<ResponseData>(uri, "GET");
  }
  /**
   * 发送POST请求
   * @param uri URI
   * @returns Promise
   */
  post<ResponseData>(uri: string | string[], bodyData: TBody = null) {
    if (bodyData) {
      this.body(bodyData);
    }
    return this.send<ResponseData>(uri, "POST");
  }
  /**
   * 发送PUT请求
   * @param uri URI
   * @returns Promise
   */
  put<ResponseData>(uri: string | string[], bodyData: TBody = null) {
    if (bodyData) {
      this.body(bodyData);
    }
    return this.send<ResponseData>(uri, "PUT");
  }
  /**
   * 发送delete请求
   * @param uri URI
   * @returns Promise
   */
  delete<ResponseData>(uri: string | string[], bodyData: TBody = null) {
    if (bodyData) {
      this.body(bodyData);
    }
    return this.send<ResponseData>(uri, "DELETE");
  }
  /**
   * 发送patch请求
   * @param uri URI
   * @returns Promise
   */
  patch<ResponseData>(uri: string | string[], bodyData: TBody = null) {
    if (bodyData) {
      this.body(bodyData);
    }
    return this.send<ResponseData>(uri, "PATCH");
  }
}