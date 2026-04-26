import { HttpStatus } from '@nestjs/common';
import { HCMClientException } from './hcm-client.exception';

/**
 * HCMTimeoutException
 * Thrown when HCM API does not respond within the timeout threshold
 * HTTP Status: 504 Gateway Timeout
 */
export class HCMTimeoutException extends HCMClientException {
  constructor(message = 'HCM request timeout (5s exceeded)') {
    super(message, HttpStatus.GATEWAY_TIMEOUT);
  }
}
