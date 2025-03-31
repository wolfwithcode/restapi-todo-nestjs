import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '../libs/auth/auth.module';
import { UserModule } from './demoApp/user/user.module';
import { PrismaModule } from '../libs/prisma/prisma.module';
import { LinkResolverModule } from './demoApp/link-resolver/link-resolver.module';
import { StorageModule } from './demoApp/storage/storage.module';
import { GS1Module } from './demoApp/gs1/gs1.module';
import { LoggingMiddleware } from '@common/middlewares/logging.middleware';
import { ResponseMiddleware } from '@common/middlewares/response.middleware';

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
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
    consumer.apply(ResponseMiddleware).forRoutes('*');
  }
}
