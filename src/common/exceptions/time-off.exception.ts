import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * TimeOffException
 * Base exception class for all time-off microservice exceptions
 */
export class TimeOffException extends HttpException {
  constructor(message: string, status: HttpStatus) {
    super(
      {
        statusCode: status,
        message,
        timestamp: new Date().toISOString(),
      },
      status,
    );
  }
}
