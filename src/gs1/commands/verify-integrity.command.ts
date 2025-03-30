import { Command, CommandRunner, Option } from 'nest-commander';
import { Injectable, Logger } from '@nestjs/common';
import { GS1ResolverService } from '../gs1-resolver.service';

interface VerifyCommandOptions {
  entityType: string;
  entityId: string;
}

@Injectable()
@Command({
  name: 'verify-integrity',
  description: 'Verify data integrity of GS1 entities',
})
export class VerifyIntegrityCommand extends CommandRunner {
  private readonly logger = new Logger(VerifyIntegrityCommand.name);

  constructor(private readonly gs1Service: GS1ResolverService) {
    super();
  }

  @Option({
    flags: '-t, --type <entityType>',
    description: 'Entity type (product, company, or metadata)',
    required: true,
  })
  parseEntityType(val: string): string {
    return val;
  }

  @Option({
    flags: '-i, --id <entityId>',
    description: 'Entity ID (e.g. product ID or company ID, use "system" for metadata)',
    required: true,
  })
  parseEntityId(val: string): string {
    return val;
  }

  async run(
    passedParams: string[],
    options: VerifyCommandOptions,
  ): Promise<void> {
    try {
      this.logger.log(`Verifying integrity of ${options.entityType} with ID: ${options.entityId}`);
      
      const result = await this.gs1Service.verifyETagConcurrency(
        options.entityType,
        options.entityId
      );
      
      console.log('\nIntegrity Verification Results:');
      console.log(`Entity Type: ${result.entityType}`);
      console.log(`Entity ID: ${result.entityId}`);
      console.log(`Timestamp: ${result.timestamp}`);
      console.log(`ETag Available: ${result.hasETag ? 'YES ✓' : 'NO ✗'}`);
      console.log(`Concurrency Control: ${result.concurrencyControlReady ? 'READY ✓' : 'NOT READY ✗'}`);
      
      if (result.etag) {
        console.log(`ETag: ${result.etag}`);
      }
      
      if (!result.concurrencyControlReady) {
        console.log('\n⚠️ Entity does not support ETag-based concurrency control! ⚠️');
        console.log('This may lead to potential data corruption in concurrent update scenarios.');
      } else {
        console.log('\n✓ Entity supports ETag-based concurrency control.');
        console.log('Update operations will be protected against concurrent modifications.');
      }
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to verify ETag concurrency: ${errorMessage}`);
    }
  }
} 