import { TOSSQuery } from "./types/JSOSSTypes";

export class JSOSS<OSSClient> {
  /**
   * 存储桶名称
   */
  protected Bucket: string = null;
  /**
   * 存储桶所在地域
   */
  protected Region: string = null;

  /**
   * COS SDK实例
   */
  protected OSSClient: OSSClient = null;
  /**
   * 对象授权信息
   */
  protected ObjectAuthorization: Map<string, string | Record<string, string>> = new Map();
  /**
   * 操作完成后需要移除授权信息的对象键名集
   */
  protected RemoveAfterUsingObject: Set<string> = new Set();
  /**
   * 实例化腾讯云COS
   * @param Region 存储桶所在地域
   * @param Bucket 存储桶名称
   */
  constructor(Region: string, Bucket: string) {
    this.Bucket = Bucket;
    this.Region = Region;
  }
  /**
   * 设置对象授权信息。每次对象操作时都需要用到不同的授权信息，例如上传对象、删除对象、获取对象等。该方法用于在这些操作前调用接口获取到授权信息后传入该方法对应的参数中，以便继续操作后使用授权信息
   * @param objectKey string 对象键名
   * @param auth string 操作对象的授权信息
   * @param removeAfterUsing boolean 操作后移除对象授权信息
   * @param httpMethod string  该授权信息适用于的请求方式
   * @returns this
   */
  objectAuthorization(objectKey: string, auth: string, removeAfterUsing: boolean = true, httpMethod: string = null) {
    if (httpMethod) {
      httpMethod = httpMethod.toString().toLowerCase();

      if (this.ObjectAuthorization.has(objectKey)) {
        const HTTPMethodAuths = this.ObjectAuthorization.get(objectKey) as Record<string, string>;
        HTTPMethodAuths[httpMethod] = auth;
        this.ObjectAuthorization.set(objectKey, HTTPMethodAuths);
      } else {
        this.ObjectAuthorization.set(objectKey, {
          [httpMethod]: auth
        });
      }
    } else {
      this.ObjectAuthorization.set(objectKey, auth);
    }

    removeAfterUsing && this.RemoveAfterUsingObject.add(objectKey);
    return this;
  }
  /**
   * 上传文件
   * @param ObjectKey string 对象键名
   * @param UploadFile File | Blob | String | ArrayBuffer 上传的文件
   * @param ACL string 对象访问控制
   * @returns Promise<string> 对象访问地址
   */
  uploadFile(ObjectKey: string, UploadFile: File | Blob | String | ArrayBuffer, ACL: string): Promise<string> {
    return Promise.resolve(null);
  }
  /**
   * 获取对象访问 URL
   * @param Key string 对象键名
   * @param Query object 签名中要签入的请求参数，{key: 'val'} 的格式
   * @param Expires number Url中的签名几秒后失效，默认为 900 秒
   * @returns string 计算得到的 Url
   */
  getObjectURL(Key: string, Query: TOSSQuery = {}, Expires: number = null): Promise<string> {
    return Promise.resolve(null);
  }
}