export interface FileWithETag<T = any> {
  data: T;
  etag: string;
}
