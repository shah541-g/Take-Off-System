import { HttpStatus } from '@nestjs/common';
import { TimeOffException } from './time-off.exception';

/**
 * InsufficientBalanceException
 * Thrown when an employee does not have enough balance for a request
 * HTTP Status: 409 Conflict
 */
export class InsufficientBalanceException extends TimeOffException {
  constructor(message = 'Insufficient balance for request') {
    super(message, HttpStatus.CONFLICT);
  }
}
