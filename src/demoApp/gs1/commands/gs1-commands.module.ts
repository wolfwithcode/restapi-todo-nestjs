import { Module } from '@nestjs/common';
import { GS1Module } from '../gs1.module';
import { InitializeGS1Command } from './initialize-gs1.command';
import { VerifyIntegrityCommand } from './verify-integrity.command';
import { VerifyETagCommand } from './verify-etag.command';
import { LinkResolverModule } from '../../link-resolver/link-resolver.module';
import { SaveSampleDataCommand } from '../../link-resolver/commands/save-sample-data.command';

@Module({
  imports: [GS1Module, LinkResolverModule],
  providers: [
    InitializeGS1Command,
    VerifyIntegrityCommand,
    VerifyETagCommand,
    SaveSampleDataCommand,
  ],
  exports: [
    InitializeGS1Command,
    VerifyIntegrityCommand,
    VerifyETagCommand,
    SaveSampleDataCommand,
  ],
})
export class GS1CommandsModule {}
