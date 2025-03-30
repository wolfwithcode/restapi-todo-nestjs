/**
 * Interface for an object returned with its ETag
 */
export interface FileWithETag<T = any> {
  /**
   * The file contents
   */
  data: T;
  
  /**
   * The ETag of the file
   */
  etag: string;
} 