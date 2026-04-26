import { HttpStatus } from '@nestjs/common';
import { TimeOffException } from './time-off.exception';

/**
 * InvalidStateTransitionException
 * Thrown when a request status transition is not allowed
 * HTTP Status: 409 Conflict
 */
export class InvalidStateTransitionException extends TimeOffException {
  constructor(message = 'Invalid request status transition') {
    super(message, HttpStatus.CONFLICT);
  }
}
