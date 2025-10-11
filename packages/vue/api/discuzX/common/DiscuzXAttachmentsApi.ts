import DiscuzXRequest from "../../../foundation/HTTP/discuzXRequest";

/**
 * DiscuzX 附件接口
 * @deprecated
 */
export class DiscuzXAttachmentsApi extends DiscuzXRequest {
  uploadAttachment(file: File): Promise<string> {
    return this.upload("attachments", file);
  }
  deleteAttachment(attachId: string): Promise<number> {
    return this.delete(`attachments/${attachId}`);
  }
  getAttachment(attachId: string): Promise<string> {
    return this.get(`attachments/${attachId}`);
  }
  genAttachmentPreviewURL(attachId: string, width: number | null = null, height: number | null = null, radio: number | null = null) {
    const SizeQuerys = [];
    if (width) {
      SizeQuerys.push(`w=${width}`);
    }
    if (height) {
      SizeQuerys.push(`h=${height}`);
    }
    if (radio) {
      SizeQuerys.push(`r=${radio}`);
    }

    return `${this.requestURL}&uri=attachments/${attachId}/preview${SizeQuerys.length ? "&" + SizeQuerys.join("&") : ""}`;
  }
  genAttachmentDownloadURL(attachId: string) {
    return `${this.requestURL}&uri=attachments/${attachId}/download`;
  }
}