import DiscuzXRequest from "../../../foundation/HTTP/discuzXRequest";

type TAttachment = {
  aid: number,
  fileName: string,
  width: number,
  height: number,
  isImage: boolean,
  size: number,
  downloadLink: string,
  thumbURL: string
}

class AttachmentApi extends DiscuzXRequest {
  uploadAttachment(file: File, body: Record<string, string> = {}, fileName: string = "file") {
    return this.upload<TAttachment>(null, file, fileName, body);
  }
  getAttachment(aid: number) {
    return this.get<TAttachment>(aid.toString());
  }
  deleteAttachment(aid: number | string) {
    return this.delete(aid.toString());
  }
}

export default new AttachmentApi("attachment");