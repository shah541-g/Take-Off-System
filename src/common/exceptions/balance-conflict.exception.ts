import { HttpStatus } from '@nestjs/common';
import { TimeOffException } from './time-off.exception';

/**
 * BalanceConflictException
 * Thrown when a balance version conflict is detected (concurrent modification)
 * HTTP Status: 409 Conflict
 */
export class BalanceConflictException extends TimeOffException {
  constructor(message = 'Balance version conflict (concurrent modification)') {
    super(message, HttpStatus.CONFLICT);
  }
}
