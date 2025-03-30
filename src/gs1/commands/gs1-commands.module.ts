import { Module } from '@nestjs/common';
import { GS1Module } from '../gs1.module';
import { InitializeGS1Command } from './initialize-gs1.command';

@Module({
  imports: [GS1Module],
  providers: [InitializeGS1Command],
  exports: [InitializeGS1Command]
})
export class GS1CommandsModule {} 