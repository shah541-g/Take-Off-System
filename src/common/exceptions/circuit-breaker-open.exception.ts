import { HttpStatus } from '@nestjs/common';
import { TimeOffException } from './time-off.exception';

/**
 * CircuitBreakerOpenException
 * Thrown when the circuit breaker for HCM service is open and requests are blocked
 * HTTP Status: 503 Service Unavailable
 */
export class CircuitBreakerOpenException extends TimeOffException {
  constructor(message = 'HCM service circuit breaker is open') {
    super(message, HttpStatus.SERVICE_UNAVAILABLE);
  }
}
