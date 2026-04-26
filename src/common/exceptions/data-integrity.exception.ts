import { HttpStatus } from '@nestjs/common';
import { TimeOffException } from './time-off.exception';

/**
 * DataIntegrityException
 * Thrown when a data integrity violation is detected
 * HTTP Status: 500 Internal Server Error
 */
export class DataIntegrityException extends TimeOffException {
  constructor(message = 'Data integrity violation') {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
