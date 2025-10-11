import { TBody, THTTPMiddleware } from "./";
import HTTP, { TMethods } from ".";

export default class Request extends HTTP {
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
    super(baseURL, method, query, body, pipes, options, headers, globalMiddlewares);
    this.prefix(prefix);
  }
  /**
   * 发送请求
   * @param uri URI
   * @param method 请求方法
   * @returns Promise
   */
  send<ResponseData>(uri: string | number | (string | number)[] = null, method: TMethods = null): Promise<ResponseData> {
    return super.send<ResponseData>(uri, method).then(res => {
      return res.data;
    });
  }
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
  /**
   * 上传文件
   * @param uri URI
   * @param tempFilePath 上传的文件路径
   * @param fileName FormData的键名
   * @param body 请求体，会添加到FormData里
   * @param task 上传任务，可以用于监听上传进度等
   * @param timeout 请求超时
   * @returns Promise
   */
  upload<ResponseData>(uri: string | string[] | null = null, file: File, fileName: string = null, body: Record<string, string> = {}): Promise<ResponseData> {
    this.header("X-Ajax", "1");

    const F: FormData = new FormData();
    for (const key in body) {
      F.append(key, body[key]);
    }
    F.append("file", file);
    fileName && F.append("fileName", fileName);

    return this.body(F).post<ResponseData>(uri) as Promise<ResponseData>;
  }
  /**
 * 轮询
 * @param request 请求方法
 * @param breakCallback 每次请求完后都会执行一次，如果返回 true 就会结束轮询。有两种情况会结束轮询，要么接口报错，要么该方法返回了 true
 * @param waitDuraion 每次轮询等待时长，秒级
 * @param stopRequest 停止轮询请求，该参数需要传入一个 Ref 引用变量，外部可通过该变量手动控制是否继续请求
 * @returns 响应结果
 */
  polling<ResponseData>(request: () => Promise<ResponseData>, breakCallback: (res: ResponseData) => boolean, waitDuraion: number = 2, stopRequest: Ref<boolean> = ref(false)): Promise<ResponseData> {
    let breakWhile: boolean = false;
    return new Promise(async (resolve, reject) => {
      while (breakWhile === false) {
        if (stopRequest.value) {
          stopRequest.value = false;
          break;
        }

        await new Promise<ResponseData>((resolve, reject) => {
          setTimeout(async () => {
            await request().then(res => {
              //* 如果返回结果是 truly 说明结束轮询
              breakWhile = breakCallback(res) === true;
              resolve(res);
            }).catch((err) => {
              breakWhile = true;
              reject(err);
            });
          }, waitDuraion * 1000)
        }).then(res => {
          if (breakWhile) {
            resolve(res);
          }
        }).catch(reject);
      }
    });
  }
  /**
   * 分页参数设置
   * @param page 页数
   * @param perPage 每页数量
   * @returns Request
   */
  page(page: number = 1, perPage: number = 10) {
    this.query("page", page);
    this.query("perPage", perPage);
    return this;
  }
  /**
   * 设置排序参数
   * @param fieldName 字段名称
   * @param sort 排序方式
   * @returns Request
   */
  order(fieldName: string, sort: string = "ASC") {
    this.query("order", fieldName);
    this.query("orderBy", sort);
    return this;
  }
  /**
   * 设置多个排序规则
   * @param rules 排序规则，键是字段名称，值是排序方式
   * @returns Request
   */
  orders(rules: Record<string, string>) {
    const orders = [];
    for (const key in rules) {
      if (rules[key] !== "" && rules[key] !== "" && rules[key].trim() !== "") {
        orders.push(`${key}:${rules[key]}`);
      } else {
        orders.push(key);
      }
    }
    if (orders.length) {
      this.query("orders", orders.join(","));
    }

    return this;
  }
}