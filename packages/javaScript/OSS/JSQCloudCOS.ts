import { JSOSS } from "./JSOSS";
import { TOSSHeaders, TOSSQuery } from "./types/JSOSSTypes";
import type COS from "cos-js-sdk-v5";
import { TCosACL } from "./types/JSQCloudCosTypes";
import { TRuyiFileAccessControl } from "../../Vue/types/common";

export class JSQCloudCOS<COSClient extends COS> extends JSOSS<COSClient> {

  constructor(COS: COSClient, Region: string, Bucket: string) {
    super(Region, Bucket);

    this.OSSClient = COS;
  }

  uploadFile(ObjectKey: string, UploadFile: File, ACL: TRuyiFileAccessControl | TCosACL = null): Promise<string> {
    return new Promise((resolve, reject) => {
      const Headers: TOSSHeaders = {};

      if (ACL) {
        Headers['x-cos-acl'] = ACL;
      }

      const Params: COS.UploadFileParams = {
        Bucket: this.Bucket,
        Region: this.Region,
        Key: ObjectKey,
        Body: UploadFile,
        Headers
      };


      this.OSSClient.uploadFile(Params, (err, data) => {
        if (err) {
          reject(err.error);
        } else {
          resolve(data.Location);
        }
        if (this.RemoveAfterUsingObject.has(ObjectKey)) {
          this.RemoveAfterUsingObject.delete(ObjectKey);
          this.ObjectAuthorization.delete(ObjectKey);
        }
      });
    });
  }

  getObjectURL(Key: string, Query: TOSSQuery = {}, Expires: number = null): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.OSSClient.getObjectUrl({
        Bucket: this.Bucket,
        Region: this.Region,
        Key,
        Expires,
        Query
      }, (err, data) => {
        if (err) {
          reject(err);
        } {
          resolve(data.Url);
        }
      });
    });
  }
}