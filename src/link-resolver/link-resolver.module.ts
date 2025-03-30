import { Module } from '@nestjs/common';
import { LinkResolverService } from './link-resolver.service';
import { LinkResolverController } from './link-resolver.controller';
import { LinkResolverRepository } from './repositories/link-resolver.repository';

@Module({
  controllers: [LinkResolverController],
  providers: [LinkResolverService, LinkResolverRepository],
  exports: [LinkResolverService],
})
export class LinkResolverModule {}
