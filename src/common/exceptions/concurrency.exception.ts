import { HttpStatus } from '@nestjs/common';
import { TimeOffException } from './time-off.exception';

/**
 * ConcurrencyException
 * Thrown when a concurrent modification is detected
 * HTTP Status: 409 Conflict
 */
export class ConcurrencyException extends TimeOffException {
  constructor(message = 'Concurrent modification detected') {
    super(message, HttpStatus.CONFLICT);
  }
}
