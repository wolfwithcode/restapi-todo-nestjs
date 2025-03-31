import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '../libs/auth/auth.module';
import { UserModule } from './demo-app/user/user.module';
import { PrismaModule } from '../libs/prisma/prisma.module';
import { LinkResolverModule } from './demo-app/link-resolver/link-resolver.module';
import { StorageModule } from './demo-app/storage/storage.module';
import { LoggingMiddleware, ResponseMiddleware } from '@common/middlewares';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UserModule,
    PrismaModule,
    LinkResolverModule,
    StorageModule,
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
