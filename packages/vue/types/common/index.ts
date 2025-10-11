export type TRuyiFileAccessControl = 'private' | 'public-read' | 'public-read-write' | 'authenticated-read' | 'authenticated-read-write';

export interface IRuyiFileInfo {
  id?: number,
  key: string,
  remote: boolean,
  platform: string,
  belongsId: string,
  belongsType: string,
  ownerId: number,
  sourceFileName: string,
  name: string,
  size: number,
  path: string,
  width: number,
  height: number,
  extension: string,
  accessControl: TRuyiFileAccessControl,
  createdAt?: number,
  updatedAt?: number,

  previewURL?: string,
  downloadURL?: string,
  transferPreviewURL?: string,
  transferDownloadURL?: string
}

export interface IRuyiFileUploadAuth {
  'header-list': string
  'key-time': string
  'sign-algorithm': string
  'sign-time': string
  signature: string
  'url-param-list': string
}
export interface IRuyiFileAuthData {
  fileKey: string,
  remoteFileKey: string,
  auth: IRuyiFileUploadAuth,
  authString: string,
  previewURL: string,
  accessControl: TRuyiFileAccessControl,
  httpMethod: 'post' | 'put'
}