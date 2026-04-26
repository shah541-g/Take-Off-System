import { HttpStatus } from '@nestjs/common';
import { TimeOffException } from './time-off.exception';

/**
 * DimensionValidationException
 * Thrown when employee-location-leaveType combination is invalid or not found in HCM
 * HTTP Status: 400 Bad Request
 */
export class DimensionValidationException extends TimeOffException {
  constructor(message = 'Invalid employee/location/leaveType combination') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}
