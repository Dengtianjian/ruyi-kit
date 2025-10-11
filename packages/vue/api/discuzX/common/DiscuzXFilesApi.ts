import DiscuzXRequest from "../../../foundation/HTTP/discuzXRequest";
import { IRuyiFileAuthData, IRuyiFileInfo } from "../../../types/common";

/**
 * DiscuzX 文件接口
 * @deprecated
 */
export class DiscuzXFilesApi extends DiscuzXRequest {
  getUploadAuth(sourceFileName: string, filePath: string, size: number) {
    return this.post<IRuyiFileAuthData>("auth/upload", {
      sourceFileName,
      filePath,
      size
    });
  }
  getFileInfo(fileKey: string) {
    return this.get<IRuyiFileInfo>(fileKey);
  }
  uploadFile(FileKey: string, file: File, body: Record<string, string> = {}, fileName: string = null) {
    return this.upload<IRuyiFileInfo>(FileKey, file, fileName, body);
  }
  deleteFile(fileKey: string) {
    return this.delete(fileKey);
  }
}

export default new DiscuzXFilesApi('files');