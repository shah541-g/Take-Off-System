import { HttpStatus } from '@nestjs/common';
import { TimeOffException } from './time-off.exception';

/**
 * HCMClientException
 * Base exception class for all HCM-related errors
 * HTTP Status: 503 Service Unavailable (default)
 */
export class HCMClientException extends TimeOffException {
  constructor(message: string, status = HttpStatus.SERVICE_UNAVAILABLE) {
    super(message, status);
  }
}
