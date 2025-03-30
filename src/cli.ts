import { CommandFactory } from 'nest-commander';
import { LinkResolverCommandsModule } from './link-resolver/commands/commands.module';
import { StorageModule } from './storage/storage.module';

async function bootstrap() {
  await CommandFactory.run(LinkResolverCommandsModule, {
    logger: ['error', 'warn'],
  });
}

bootstrap(); 