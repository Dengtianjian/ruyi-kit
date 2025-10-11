import { TBody, THTTPMiddleware, TMethods } from ".";
import RuyiRequest from "./RuyiRequest";

export default class extends RuyiRequest {
  constructor(prefix: string = null, baseURL: string = null, method: TMethods = "GET", query: Record<string, number | string | boolean> = {}, body: TBody = null, pipes: string[] = [], options: RequestInit = {}, headers: Record<string, string> = {}, globalMiddlewares: Array<THTTPMiddleware> = []) {
    super(prefix, baseURL, method, query, body, pipes, options, headers, globalMiddlewares);
  }
  generateRequestURL(baseURL: string, uri: string | number | (string | number)[], query?: Record<string, string | number>): string {
    uri = uri ?? [];
    let queryString: string = "";

    if (baseURL.includes("?")) {
      const uris = baseURL.split("?");
      uris[1].split("&").map(item => item.split("=")).forEach(item => {
        if (!query[item[0]]) {
          query[item[0]] = item[1];
        }
      });
      baseURL = baseURL.substring(0, baseURL.lastIndexOf("?"));
    }

    let queryGroup: string[] = [];
    for (const key in query) {
      queryGroup.push(`${key}=${query[key]}`);
    }
    queryString = queryGroup.join("&");

    return `${baseURL}?${queryString}`;
  }
  send<ResponseData>(uri: string | number | (string | number)[] = null, method: TMethods = null): Promise<ResponseData> {

    let URIs = [];
    if (uri) {
      if (Array.isArray(uri)) {
        URIs.push(...uri);
      } else {
        URIs.push(uri);
      }
    }

    if (this.requestPrefix) {
      if (Array.isArray(this.requestPrefix)) {
        URIs.unshift(...this.requestPrefix);
      } else {
        URIs.unshift(this.requestPrefix);
      }
    }

    this.query("uri", URIs ? URIs.join("/") : "/");
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