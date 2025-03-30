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
      
      const result = await this.gs1Service.verifyIntegrity(
        options.entityType,
        options.entityId
      );
      
      console.log('\nIntegrity Verification Results:');
      console.log(`Entity Type: ${result.entityType}`);
      console.log(`Entity ID: ${result.entityId}`);
      console.log(`Timestamp: ${result.timestamp}`);
      console.log(`Overall Integrity: ${result.isValid ? 'VALID ✓' : 'INVALID ✗'}`);
      console.log('\nFile Verification Results:');
      
      for (const [file, valid] of Object.entries(result.files)) {
        console.log(`  ${file}: ${valid ? 'VALID ✓' : 'INVALID ✗'}`);
      }
      
      if (!result.isValid) {
        console.log('\n⚠️ Integrity check failed for one or more files! ⚠️');
        console.log('This indicates that files may have been tampered with or corrupted.');
      } else {
        console.log('\n✓ All integrity checks passed successfully.');
      }
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to verify integrity: ${errorMessage}`);
    }
  }
} 