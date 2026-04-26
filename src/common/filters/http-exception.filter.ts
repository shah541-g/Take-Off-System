import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * HttpExceptionFilter
 * Catches all HttpExceptions and formats them consistently
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const body =
      typeof exceptionResponse === 'object'
        ? exceptionResponse
        : {
            statusCode: status,
            message: exceptionResponse,
          };

    this.logger.warn(
      `[${request.method}] ${request.url} - Status: ${status} - Message: ${JSON.stringify(body)}`,
    );

    response.status(status).json({
      ...body,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
