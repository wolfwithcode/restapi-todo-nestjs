import { Command, CommandRunner, Option } from 'nest-commander';
import { Injectable, Logger } from '@nestjs/common';
import { GS1ResolverService } from '../gs1-resolver.service';

interface VerifyETagOptions {
  entityType: string;
  entityId: string;
}

@Command({
  name: 'verify-etag',
  description: 'Verify ETag concurrency control for GS1 entities',
})
@Injectable()
export class VerifyETagCommand extends CommandRunner {
  private readonly logger = new Logger(VerifyETagCommand.name);

  constructor(private readonly gs1Service: GS1ResolverService) {
    super();
  }

  async run(passedParams: string[], options?: VerifyETagOptions): Promise<void> {
    this.logger.log('Running ETag concurrency control verification...');

    try {
      const { entityType, entityId } = options || { entityType: 'metadata', entityId: 'system' };

      if (!entityType || !entityId) {
        throw new Error('Entity type and entity ID are required');
      }

      // Check that entity type is valid
      if (!['product', 'company', 'metadata'].includes(entityType)) {
        throw new Error(`Invalid entity type: ${entityType}`);
      }

      const result = await this.gs1Service.verifyETagConcurrency(entityType, entityId);

      if (result.concurrencyControlReady) {
        this.logger.log(`✅ ETag concurrency control verification successful for ${entityType}/${entityId}`);
        this.logger.log(`ETag: ${result.etag}`);
      } else {
        this.logger.error(`⚠️ ETag concurrency control verification failed for ${entityType}/${entityId}`);
        this.logger.error('No ETag found. This entity might not support ETag-based concurrency control.');
        process.exit(1);
      }
    } catch (error) {
      this.logger.error(`Error verifying ETag concurrency control: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  @Option({
    flags: '-t, --entityType [string]',
    description: 'Entity type (product, company, metadata)',
  })
  parseEntityType(val: string): string {
    return val;
  }

  @Option({
    flags: '-i, --entityId [string]',
    description: 'Entity ID',
  })
  parseEntityId(val: string): string {
    return val;
  }
} 