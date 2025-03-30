import { CommandFactory } from 'nest-commander';
import { LinkResolverCommandsModule } from './link-resolver/commands/commands.module';
import { GS1CommandsModule } from './gs1/commands/gs1-commands.module';

async function bootstrap() {
  // By default, run the GS1CommandsModule which has all the commands we need
  await CommandFactory.run(GS1CommandsModule, {
    logger: ['error', 'warn'],
  });
}

bootstrap(); 