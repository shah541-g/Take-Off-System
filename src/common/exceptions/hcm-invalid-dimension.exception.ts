import { HttpStatus } from '@nestjs/common';
import { HCMClientException } from './hcm-client.exception';

/**
 * HCMInvalidDimensionException
 * Thrown when an invalid dimension (employee/location/leaveType) is encountered in HCM
 * HTTP Status: 404 Not Found
 */
export class HCMInvalidDimensionException extends HCMClientException {
  constructor(message = 'Invalid dimension in HCM') {
    super(message, HttpStatus.NOT_FOUND);
  }
}
