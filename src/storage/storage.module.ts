import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MinioService } from './minio.service';
import { GS1StorageService } from './gs1-storage.service';
import storageConfig from './config/storage.config';

@Module({
  imports: [
    ConfigModule.forFeature(storageConfig),
  ],
  providers: [MinioService, GS1StorageService],
  exports: [MinioService, GS1StorageService],
})
export class StorageModule {} 