import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { TodoModule } from './todo/todo.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { LinkResolverModule } from './link-resolver/link-resolver.module';
import { StorageModule } from './storage/storage.module';
import { GS1Module } from './gs1/gs1.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UserModule,
    TodoModule,
    PrismaModule,
    LinkResolverModule,
    StorageModule,
    GS1Module,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
