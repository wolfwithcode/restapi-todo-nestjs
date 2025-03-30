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
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly logger = new Logger(MinioService.name);

  constructor(private readonly configService: ConfigService) {
    const storageConfig = this.configService.get('storage.minio');
    
    this.bucket = storageConfig.bucket;
    
    this.s3Client = new S3Client({
      region: storageConfig.region,
      endpoint: `http${storageConfig.useSSL ? 's' : ''}://${storageConfig.endpoint}:${storageConfig.port}`,
      forcePathStyle: true, // Needed for MinIO
      credentials: {
        accessKeyId: storageConfig.accessKey,
        secretAccessKey: storageConfig.secretKey,
      },
    });
    
    this.logger.log(`MinIO service initialized: endpoint=${storageConfig.endpoint}, bucket=${this.bucket}`);
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
   * @returns Success flag
   */
  async uploadFile(key: string, data: any, contentType = 'application/json'): Promise<boolean> {
    try {
      const result = await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: typeof data === 'string' ? data : JSON.stringify(data),
          ContentType: contentType,
        }),
      );
      
      this.logger.debug(`File uploaded successfully: ${key}`);
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error uploading file ${key}: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Read a file from MinIO
   * @param key Object key (path)
   * @returns File data
   */
  async getFile(key: string): Promise<any> {
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      
      // Convert stream to string
      const bodyContents = await this.streamToString(response.Body as Readable);
      
      try {
        // Try to parse as JSON
        return JSON.parse(bodyContents);
      } catch (e) {
        // Return as string if not valid JSON
        return bodyContents;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting file ${key}: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Delete a file from MinIO
   * @param key Object key (path)
   * @returns Success flag
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
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