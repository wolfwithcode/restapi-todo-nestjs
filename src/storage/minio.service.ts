import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

/**
 * Interface for file retrieval with ETag
 */
export interface FileWithETag {
  data: any;
  etag: string;
}

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly logger = new Logger(MinioService.name);

  constructor(private readonly configService: ConfigService) {
    const storageConfig = this.configService.get('storage.minio');
    
    this.bucket = storageConfig.bucket;
    
    this.s3Client = new S3Client({
      region: 'us-east-1', // Default region
      endpoint: 'http://135.181.26.126:9000', // Hardcoded endpoint with API port
      forcePathStyle: true, // Needed for MinIO
      credentials: {
        accessKeyId: 'minioadmin',
        secretAccessKey: 'minioadmin',
      },
    });
    
    this.logger.log(`MinIO service initialized: endpoint=135.181.26.126:9000, bucket=${this.bucket}`);
  }

  async onModuleInit() {
    try {
      // Check if bucket exists
      try {
        await this.s3Client.send(
          new HeadBucketCommand({ Bucket: this.bucket }),
        );
        this.logger.log(`Bucket '${this.bucket}' already exists`);
      } catch (error: unknown) {
        // Create bucket if it doesn't exist
        this.logger.log(`Creating bucket '${this.bucket}'...`);
        await this.s3Client.send(
          new CreateBucketCommand({ Bucket: this.bucket }),
        );
        this.logger.log(`Bucket '${this.bucket}' created successfully`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to initialize MinIO bucket: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Upload a file to MinIO
   * @param key Object key (path)
   * @param data File data (Buffer, string, etc.)
   * @param contentType MIME type
   * @param ifMatch Optional ETag for conditional update (concurrency control)
   * @returns Object with success flag and ETag if successful
   */
  async uploadFile(
    key: string, 
    data: any, 
    contentType = 'application/json',
    ifMatch?: string
  ): Promise<{ success: boolean; etag?: string }> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: typeof data === 'string' ? data : JSON.stringify(data),
        ContentType: contentType,
        ...(ifMatch && { IfMatch: ifMatch }),
      });
      
      const result = await this.s3Client.send(command);
      
      // Return success with ETag for future concurrency control
      return { 
        success: true,
        etag: result.ETag?.replace(/"/g, '') // Remove quotes from ETag
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if this is a precondition failed error (ETag mismatch)
      if (errorMessage.includes('PreconditionFailed') || errorMessage.includes('412')) {
        this.logger.warn(`Concurrency conflict detected for ${key}: ETag doesn't match`);
        return { 
          success: false,
          etag: undefined 
        };
      }
      
      this.logger.error(`Error uploading file ${key}: ${errorMessage}`);
      return { success: false };
    }
  }

  /**
   * Read a file from MinIO with its ETag
   * @param key Object key (path)
   * @returns File data with ETag or null if not found
   */
  async getFileWithETag(key: string): Promise<FileWithETag | null> {
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      
      // Convert stream to string
      const bodyContents = await this.streamToString(response.Body as Readable);
      let data;
      
      try {
        // Try to parse as JSON
        data = JSON.parse(bodyContents);
      } catch (e) {
        // Return as string if not valid JSON
        data = bodyContents;
      }
      
      // Extract and clean ETag
      const etag = response.ETag?.replace(/"/g, '') || '';
      
      return { data, etag };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting file ${key}: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Get file without returning ETag (for backward compatibility)
   * @param key Object key (path)
   * @returns File data
   */
  async getFile(key: string): Promise<any> {
    const result = await this.getFileWithETag(key);
    return result ? result.data : null;
  }

  /**
   * Get only the ETag of a file without fetching its contents
   * @param key Object key (path)
   * @returns ETag string or null if not found
   */
  async getETag(key: string): Promise<string | null> {
    try {
      const response = await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      
      return response.ETag?.replace(/"/g, '') || null;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting ETag for ${key}: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Delete a file from MinIO
   * @param key Object key (path)
   * @param ifMatch Optional ETag for conditional delete
   * @returns Success flag
   */
  async deleteFile(key: string, ifMatch?: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
          ...(ifMatch && { IfMatch: ifMatch }),
        }),
      );
      
      this.logger.debug(`File deleted successfully: ${key}`);
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error deleting file ${key}: ${errorMessage}`);
      return false;
    }
  }

  /**
   * List all files in a directory
   * @param prefix Directory prefix
   * @returns List of file keys
   */
  async listFiles(prefix: string = ''): Promise<string[]> {
    try {
      const response = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
        }),
      );
      
      return (response.Contents || []).map((item) => item.Key as string);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error listing files with prefix ${prefix}: ${errorMessage}`);
      return [];
    }
  }

  /**
   * Generate a presigned URL for temporary access to a file
   * @param key Object key
   * @param expiresIn Expiration time in seconds
   * @returns Presigned URL
   */
  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      
      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error generating presigned URL for ${key}: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Convert a readable stream to a string
   * @param stream Readable stream
   * @returns String contents
   */
  private async streamToString(stream: Readable): Promise<string> {
    const chunks: Buffer[] = [];
    
    return new Promise<string>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (err: Error) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
  }
} 