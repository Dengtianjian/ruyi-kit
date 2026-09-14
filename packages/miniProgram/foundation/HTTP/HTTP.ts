export type TMethods = | 'OPTIONS' | 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'TRACE' | 'CONNECT';

export type TBody = string | Record<string, any> | ArrayBuffer | Array<any> | null;

type HTTPResponse<ResponseData> = {
  code: number | string,
  message: string,
  data: ResponseData,
  details: any,
  statusCode: number,
  requiredTime: string,
  version: string,
}

export interface IResponse<ResponseData> {
  statusCode: number,
  header: Record<string, string>,
  cookies: string[],
  profile: WechatMiniprogram.RequestProfile,
  error: boolean,
  code: number | string,
  message: string,
  data: ResponseData,
  details: any,
  requiredTime: string,
  version: string,
}

export default class HTTP {
  #baseUrl: string = null;
  /**
   * 获取基URL
   */
  get getBaseUrl() {
    return this.#baseUrl;
  }
  #method: TMethods = "GET";
  /**
   * 获取请求方式
   */
  get getMethod() {
    return this.#method;
  }
  #query: Record<string, string> = {};
  /**
   * 获取请求查询参数
   */
  get getQuery() {
    return this.#query;
  }
  #body: TBody = null;
  /**
   * 获取请求体
   */
  get getBody() {
    return this.#body;
  }
  #transforms: string[] = [];
  /**
   * 获取数据转换指令
   */
  get getTransforms() {
    return this.#transforms;
  }
  #headers: Record<string, string> = {};
  /**
   * 获取请求头
   */
  get getHeaders() {
    return this.#headers;
  }

  /**
   * 构建HTTP实例
   * @param baseUrl 基URL
   * @param method 请求方式
   * @param query 查询参数
   * @param body 请求体
   * @param transforms 数据转换指令
   */
  constructor(baseUrl: string = null, method: TMethods = "GET", query: Record<string, number | string | boolean> = {}, body: TBody = null, transforms: string[] = []) {
    this.#baseUrl = baseUrl;
    this.#method = method;
    for (const key in query) {
      let value = query[key];
      if (typeof value === "boolean") {
        value = Number(value);
      }

      this.#query[key] = value.toString();
    }
    this.#body = body;
    this.#transforms = transforms;
  }
  /**
   * 设置请求根地址
   * @param baseUrl URL地址
   * @returns HTTP
   */
  url(baseUrl: string) {
    this.#baseUrl = baseUrl;
    return this;
  }
  /**
   * 增加数据转换指令
   * @param transforms 转换指令
   * @returns HTTP
   */
  transforms(...transforms: string[]): this {
    this.#transforms.push(...transforms);
    return this;
  }
  /**
   * 设置查询参数
   * @param key 键
   * @param value 值
   * @param allowNull 如果传入的值为null是否继续传
   * @returns HTTP
   */
  query(key: string, value: number | string | boolean, allowNull: boolean = false): this {
    if (value === null && allowNull === false) {
      return this;
    }
    if (typeof value === "boolean") {
      value = Number(value);
    }
    this.#query[key] = value.toString();
    return this;
  }
  /**
   * 设置请求体数据
   * @param data 请求体数据
   * @returns HTTP
   */
  body(data: TBody) {
    this.#body = data;
    return this;
  }
  /**
   * 设置请求头参数
   * @param key 键
   * @param value 值
   * @returns HTTP
   */
  header(key: string, value: string = "") {
    this.#headers[key] = value;
    return this;
  }
  /**
   * 移除头部指定键
   * @param key 键名
   * @returns this
   */
  removeHeader(key: string) {
    delete this.#headers[key];
    return this;
  }
  /**
   * 生成一个URL
   * @param baseUrl 基URL
   * @param uri URI
   * @param query 查询参数
   * @returns string
   */
  static genUrl(baseUrl: string, uri: string | number | (string | number)[], query: Record<string, string | number> = {}): string {
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

    if (baseUrl[baseUrl.length - 1] === "/") {
      baseUrl = baseUrl.substring(0, baseUrl.length - 1);
    }
    uri = Array.isArray(uri) ? uri : [uri];
    uri = uri.map(item => {
      item = item.toString();
      if (item[0] === "/") {
        item = item.substring(1, item.length);
      }
      if (item[item.length - 1] === "/") {
        item = item.substring(0, item.length - 1);
      }

      return item;
    });
    uri = uri.filter(item => item.toString().trim());
    return [baseUrl, ...uri].join("/") + `?${queryString}`;
  }
  /**
   * 处理响应结果
   * @param data 数据
   * @param statusCode HTTP状态码
   * @param header 响应头
   * @param cookies 响应Cookies
   * @param profile 请求参数
   * @returns object
   */
  static handleResult<ResponseData>(data: HTTPResponse<ResponseData>, statusCode: number, header: WechatMiniprogram.IAnyObject, cookies: string[], profile: WechatMiniprogram.RequestProfile = null): IResponse<ResponseData> {
    const responseBody: IResponse<ResponseData> = {
      code: statusCode,
      message: "ok",
      // @ts-ignore
      data,
      details: null,
      statusCode,
      header,
      cookies,
      profile,
      version: null,
      requiredTime: null,
      error: statusCode > 299
    };

    if (header['Content-Type'].includes("application/json")) {
      responseBody.data = data.data;
      responseBody.message = data.message;
      responseBody.details = data.details;
      responseBody.version = data.version;
      responseBody.requiredTime = data.requiredTime;
      responseBody.code = data.code;
    }

    if (responseBody.statusCode > 299) {
      responseBody['error'] = false;
    } else {
      responseBody['error'] = true;
    }

    return responseBody;
  }
  /**
   * 发送请求
   * @param uri URI
   * @param method 请求方式
   * @returns Promise
   */
  send<ResponseData>(uri: string | number | (string | number)[] = null, method: TMethods = null): Promise<IResponse<ResponseData>> {
    method = method ?? this.#method;

    if (this.#transforms.length) {
      this.query("_transform", this.#transforms.join(","));
      this.#transforms = [];
    }

    const Headers = this.#headers;
    this.#headers = {};

    if ((!Headers['content-type'] || !Headers['Content-type']) && typeof this.#body === "object" || Array.isArray(this.#body)) {
      Headers['content-type'] = "application/json";
    }

    const url = HTTP.genUrl(this.#baseUrl, uri, this.#query);
    this.#query = {}

    const data = this.#body;
    this.#body = null;
    return new Promise<IResponse<ResponseData>>((resolve, reject) => {
      wx.request<HTTPResponse<ResponseData>>({
        url: URL,
        method,
        header: Headers,
        data,
        success({
          data,
          statusCode,
          header,
          cookies,
          profile
        }) {
          const responseBody = HTTP.handleResult(data, statusCode, header, cookies, profile);

          if (responseBody.statusCode > 299) {
            reject(responseBody);
          } else {
            resolve(responseBody);
          }
        },
        fail: reject
      })
    });
  }
  /**
   * 发送GET请求
   * @param uri URI
   * @returns Promise
   */
  get<ResponseData>(uri: string | string[]) {
    return this.send<ResponseData>(uri, "GET");
  }
  /**
   * 发送POST请求
   * @param uri URI
   * @returns Promise
   */
  post<ResponseData>(uri: string | string[]) {
    return this.send<ResponseData>(uri, "POST");
  }
  /**
   * 发送PUT请求
   * @param uri URI
   * @returns Promise
   */
  put<ResponseData>(uri: string | string[]) {
    return this.send<ResponseData>(uri, "PUT");
  }
  /**
   * 发送delete请求
   * @param uri URI
   * @returns Promise
   */
  delete<ResponseData>(uri: string | string[]) {
    return this.send<ResponseData>(uri, "DELETE");
  }
}