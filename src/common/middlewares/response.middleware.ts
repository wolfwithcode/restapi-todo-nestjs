import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';

@Injectable()
export class ResponseMiddleware implements NestMiddleware {
  // eslint-disable-next-line @typescript-eslint/ban-types
  use(req: Request, res: Response, next: Function) {
    const oldSend = res.send;

    res.send = (body: any): Response => {
      if (typeof body === 'object' && body.success !== undefined) {
        return oldSend.call(res, {
          success: body.success || false,
          data: body.data || null,
          message: body.message || '',
        });
      }

      return oldSend.call(res, body);
    };

    next();
  }
}
