import { HttpException, HttpStatus } from '@nestjs/common';

interface MinioExceptionResponse {
  message: string;
  errorDetails?: any;
}

export class MinioException extends HttpException {
  constructor(message: string, errorDetails?: any) {
    const response: MinioExceptionResponse = {
      message,
      errorDetails,
    };

    super(response, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
