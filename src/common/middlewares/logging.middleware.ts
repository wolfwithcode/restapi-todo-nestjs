import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  // eslint-disable-next-line @typescript-eslint/ban-types
  use(req: Request, res: Response, next: Function) {
    const now = Date.now();
    console.log(`Incoming request: ${req.method} ${req.originalUrl}`);
    res.on('finish', () => {
      console.log(`Response sent in ${Date.now() - now}ms`);
    });
    next();
  }
}
