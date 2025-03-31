import { Module } from '@nestjs/common';
import { LinkResolverService } from './link-resolver.service';
import { LinkResolverController } from './link-resolver.controller';
import { MinioLinkResolverRepository } from './repositories/minio-link-resolver.repository';
import { StorageModule } from '@app/storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [LinkResolverController],
  providers: [
    LinkResolverService,
    // Choose one of the repository implementations
    // For in-memory storage:
    // { provide: 'LINK_RESOLVER_REPOSITORY', useClass: LinkResolverRepository },
    // For MinIO storage:
    {
      provide: 'LINK_RESOLVER_REPOSITORY',
      useClass: MinioLinkResolverRepository,
    },
  ],
  exports: [LinkResolverService],
})
export class LinkResolverModule {}
