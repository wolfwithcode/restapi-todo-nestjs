import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { MinioException } from '../exceptions/minio.exception';
import { Response } from 'express';

@Catch(MinioException)
export class MinioExceptionFilter implements ExceptionFilter {
  catch(exception: MinioException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse();
    const errorMessage = (exceptionResponse as any).message || 'Unknown error';
    const errorDetails = (exceptionResponse as any).errorDetails;

    response.status(status).json({
      statusCode: status,
      message: errorMessage,
      errorDetails: errorDetails || null,
    });
  }
}
