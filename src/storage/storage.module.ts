import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MinioService } from './minio.service';
import storageConfig from './config/storage.config';

@Module({
  imports: [
    ConfigModule.forFeature(storageConfig),
  ],
  providers: [MinioService],
  exports: [MinioService],
})
export class StorageModule {} 