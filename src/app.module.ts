import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '../lib/auth/auth.module';
import { UserModule } from './demoApp/user/user.module';
import { PrismaModule } from '../lib/prisma/prisma.module';
import { LinkResolverModule } from './demoApp/link-resolver/link-resolver.module';
import { StorageModule } from './demoApp/storage/storage.module';
import { GS1Module } from './demoApp/gs1/gs1.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UserModule,
    PrismaModule,
    LinkResolverModule,
    StorageModule,
    GS1Module,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
