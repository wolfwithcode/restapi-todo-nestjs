import { Module } from '@nestjs/common';
import { GS1Module } from '../gs1.module';
import { InitializeGS1Command } from './initialize-gs1.command';
import { VerifyIntegrityCommand } from './verify-integrity.command';
import { VerifyETagCommand } from './verify-etag.command';

@Module({
  imports: [GS1Module],
  providers: [
    InitializeGS1Command,
    VerifyIntegrityCommand,
    VerifyETagCommand
  ],
  exports: [
    InitializeGS1Command,
    VerifyIntegrityCommand,
    VerifyETagCommand
  ]
})
export class GS1CommandsModule {} 