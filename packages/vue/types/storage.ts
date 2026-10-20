export type TStorageAccessControl = 'private' | 'public-read' | 'public-read-write' | 'authenticated-read' | 'authenticated-read-write';

export type TStorageData = {
  id: number,
  key: string,
  disk: string,
  ref: string,
  type: string,
  mime_type: string,
  owner_id: string,
  source_file_name: string,
  name: string,
  size: number,
  path: string,
  width: number,
  height: number
  extension: string,
  access_control: string,
  url?: string
}

export type TStorageInfo = {
  id: number,
  key: string,
  name: string,
  mime_type: string,
  source_file_name: string,
  size: number,
  width: number,
  height: number,
  extension: string,
  url?: string
}

export type TStorageAuth = {
  key: string,
  method: string,
  accessControl: TStorageAccessControl,
  auth: {
    [key: string]: string,
    'header-list': string
    'key-time': string
    'sign-algorithm': string
    'sign-time': string
    signature: string
    'url-param-list': string
  }
}