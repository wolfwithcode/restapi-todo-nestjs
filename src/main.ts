import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { Request } from 'express';
import * as cookieParser from 'cookie-parser';
import * as csurf from 'csurf';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { MinioExceptionFilter } from '@common/filters';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    credentials: true,
    origin: ['http://localhost:3000'],
  });

  app.use(cookieParser());

  app.use(
    csurf({
      cookie: {
        httpOnly: true,
        sameSite: 'none',
        secure: true,
      },
      value: (req: Request) => {
        return req.header('csrf-token');
      },
    }),
  );

  // Global exception filters
  app.useGlobalFilters(new MinioExceptionFilter());

  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('NestJS API')
    .setDescription('NestJS API with ETag-based concurrency control')
    .setVersion('1.0')
    .addTag('GS1 Identity Resolver')
    .addTag('Link Resolver')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT || 3006);
}

bootstrap();
