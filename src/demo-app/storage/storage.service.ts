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
import { FileWithETag } from './storage.type';
import { MinioException } from '@common/exceptions/minio.exception';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly configService: ConfigService) {
    const storageConfig = this.configService.get('storage.minio');
    this.logger.debug(`storage config ${storageConfig.bucket}`);

    if (!storageConfig) {
      this.logger.error('MinIO configuration not found.');
      throw new Error('MinIO configuration not found.');
    }

    this.bucket = storageConfig.bucket;

    if (!this.bucket) {
      this.logger.error('MinIO bucket name not configured.');
      throw new Error('MinIO bucket name not configured.');
    }

    this.s3Client = new S3Client({
      region: storageConfig.region || 'us-east-1',
      endpoint: storageConfig.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: storageConfig.accessKeyId,
        secretAccessKey: storageConfig.secretAccessKey,
      },
    });

    this.logger.log(
      `MinIO service initialized: endpoint=${storageConfig.endpoint}, bucket=${this.bucket}`,
    );
  }

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  private async ensureBucketExists() {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket '${this.bucket}' already exists`);
    } catch (error: any) {
      if (error && error.$metadata && error.$metadata.httpStatusCode === 404) {
        this.logger.log(`Creating bucket '${this.bucket}'...`);
        await this.s3Client.send(
          new CreateBucketCommand({ Bucket: this.bucket }),
        );
        this.logger.log(`Bucket '${this.bucket}' created successfully`);
      } else {
        throw new MinioException('Failed to initialize MinIO bucket', {
          error: error.message,
        });
      }
    }
  }

  async uploadFile(
    key: string,
    data: any,
    contentType = 'application/json',
    ifMatch?: string,
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

      this.logger.log(`Successfully uploaded file: ${key}`);
      return {
        success: true,
        etag: result.ETag?.replace(/"/g, ''),
      };
    } catch (error: any) {
      if (
        error.message.includes('PreconditionFailed') ||
        error.message.includes('412')
      ) {
        this.logger.warn(
          `Concurrency conflict detected for ${key}: ETag doesn't match`,
        );
        return { success: false, etag: undefined };
      }

      this.handleError(error, 'file upload', key);
      return { success: false };
    }
  }

  async getFileWithETag(key: string): Promise<FileWithETag | null> {
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      const bodyContents = await this.streamToString(response.Body as Readable);
      let data;

      try {
        data = JSON.parse(bodyContents);
      } catch (e) {
        data = bodyContents;
      }

      const etag = response.ETag?.replace(/"/g, '') || '';

      return { data, etag };
    } catch (error: any) {
      this.handleError(error, 'get file', key);
      return null;
    }
  }

  async getFile(key: string): Promise<any> {
    const result = await this.getFileWithETag(key);
    return result ? result.data : null;
  }

  async getETag(key: string): Promise<string | null> {
    try {
      const response = await this.s3Client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return response.ETag?.replace(/"/g, '') || null;
    } catch (error: any) {
      this.handleError(error, 'get ETag', key);
      return null;
    }
  }

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
    } catch (error: any) {
      this.handleError(error, 'delete file', key);
      return false;
    }
  }

  async listFiles(prefix = ''): Promise<string[]> {
    try {
      const response = await this.s3Client.send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix }),
      );
      return (response.Contents || []).map((item) => item.Key as string);
    } catch (error: any) {
      this.handleError(error, 'list files', prefix);
      return [];
    }
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string | null> {
    try {
      const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error: any) {
      this.handleError(error, 'generate presigned URL', key);
      return null;
    }
  }

  private async streamToString(stream: Readable): Promise<string> {
    const chunks: Buffer[] = [];
    return new Promise<string>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (err: Error) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
  }

  private handleError(error: any, action: string, key: string) {
    const errorMessage = error.message || String(error);
    this.logger.error(`Error during ${action} on ${key}: ${errorMessage}`);
  }
}
