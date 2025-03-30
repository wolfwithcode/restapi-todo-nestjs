import { Module } from '@nestjs/common';
import { GS1ResolverService } from './gs1-resolver.service';
import { GS1ResolverController } from './gs1-resolver.controller';
import { StorageModule } from '../storage/storage.module';
import { InitializeGS1Command } from './commands/initialize-gs1.command';
import { VerifyIntegrityCommand } from './commands/verify-integrity.command';
import { VerifyETagCommand } from './commands/verify-etag.command';

@Module({
  imports: [StorageModule],
  controllers: [GS1ResolverController],
  providers: [
    GS1ResolverService,
    InitializeGS1Command,
    VerifyIntegrityCommand,
    VerifyETagCommand,
  ],
  exports: [GS1ResolverService],
})
export class GS1Module {} 