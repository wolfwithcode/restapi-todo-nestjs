import { Module } from '@nestjs/common';
import { GS1Module } from '../gs1.module';
import { InitializeGS1Command } from './initialize-gs1.command';
import { VerifyIntegrityCommand } from './verify-integrity.command';

@Module({
  imports: [GS1Module],
  providers: [
    InitializeGS1Command,
    VerifyIntegrityCommand
  ],
  exports: [
    InitializeGS1Command,
    VerifyIntegrityCommand
  ]
})
export class GS1CommandsModule {} 