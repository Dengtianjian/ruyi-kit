import { IResponse, TBody, THTTPMiddleware } from ".";
import HTTP, { TMethods } from ".";
import Request from "./request";

export default class RuyiRequest extends Request {
  /**
 * 构建HTTP实例
 * @param prefix 前缀
 * @param baseURL 基URL
 * @param method 请求方式
 * @param query 查询参数
 * @param body 请求体
 * @param pipes 数据管道
 */
  constructor(prefix: string = null, baseURL: string = null, method: TMethods = "GET", query: Record<string, number | string | boolean> = {}, body: TBody = null, pipes: string[] = [], options: RequestInit = {}, headers: Record<string, string> = {}, globalMiddlewares: Array<THTTPMiddleware> = []) {
    globalMiddlewares.push(async (http, next) => {
      http.header("X-Ajax", "1");
      if (localStorage.getItem("Ruyi_Token")) {
        http.header("Authorization", `Bearer ${localStorage.getItem("Ruyi_Token")}`);
      }
      const res = await next() as IResponse<any>;
      this.#tokenHandle(res.header);

      return res;
    });

    super(prefix, baseURL, method, query, body, pipes, options, headers, globalMiddlewares);
  }
  /**
   * 处理鉴权Token
   * @param headers 响应头
   */
  #tokenHandle(headers: Record<string, string>): void {
    if (headers['Authorization'] || headers['authorization']) {
      const Auth: string = headers['Authorization'] || headers['authorization'];
      if (Auth) {
        const token: string = Auth.slice(0, Auth.lastIndexOf("/"));
        const tokenExpiration: string = (Number(Auth.slice(Auth.lastIndexOf("/") + 1)) * 1000).toString();

        if (!localStorage.getItem("Ruyi_Token") || localStorage.getItem("Ruyi_Token") !== token) {
          localStorage.setItem("Ruyi_Token", token);
          localStorage.setItem("Ruyi_TokenExpiration", tokenExpiration);
        }
      } else {
        localStorage.removeItem("Ruyi_Token");
        localStorage.removeItem("Ruyi_TokenExpiration");
      }
    }
  }
}