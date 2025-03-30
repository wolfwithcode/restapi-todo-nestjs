import { Module } from '@nestjs/common';
import { SaveSampleDataCommand } from './save-sample-data.command';
import { LinkResolverModule } from '../link-resolver.module';

@Module({
  imports: [LinkResolverModule],
  providers: [SaveSampleDataCommand],
  exports: [SaveSampleDataCommand],
})
export class LinkResolverCommandsModule {}
