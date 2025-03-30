import { CommandFactory } from 'nest-commander';
import { LinkResolverCommandsModule } from './link-resolver/commands/commands.module';
import { GS1CommandsModule } from './gs1/commands/gs1-commands.module';

async function bootstrap() {
  // To run LinkResolver commands
  if (process.argv.includes('--link-resolver')) {
    await CommandFactory.run(LinkResolverCommandsModule, {
      logger: ['error', 'warn'],
    });
  } 
  // To run GS1 commands
  else if (process.argv.includes('--gs1')) {
    await CommandFactory.run(GS1CommandsModule, {
      logger: ['error', 'warn'],
    });
  }
  // Default to LinkResolver commands for backward compatibility
  else {
    await CommandFactory.run(LinkResolverCommandsModule, {
      logger: ['error', 'warn'],
    });
  }
}

bootstrap(); 