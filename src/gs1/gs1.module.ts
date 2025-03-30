import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { GS1ResolverService } from './gs1-resolver.service';
import { GS1ResolverController } from './gs1-resolver.controller';

@Module({
  imports: [StorageModule],
  controllers: [GS1ResolverController],
  providers: [GS1ResolverService],
  exports: [GS1ResolverService]
})
export class GS1Module {} 