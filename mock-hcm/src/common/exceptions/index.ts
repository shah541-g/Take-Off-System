/**
 * HCM Timeout Exception
 * Thrown when HCM request exceeds timeout
 */
export class HCMTimeoutException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HCMTimeoutException';
  }
}

/**
 * HCM Client Exception
 * Generic HCM client error
 */
export class HCMClientException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HCMClientException';
  }
}

/**
 * HCM Invalid Dimension Exception
 * Thrown for invalid employee-location-leaveType combinations
 */
export class HCMInvalidDimensionException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HCMInvalidDimensionException';
  }
}

/**
 * Insufficient Balance Exception
 * Thrown when requested days exceed available balance
 */
export class InsufficientBalanceException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientBalanceException';
  }
}

/**
 * Circuit Breaker Open Exception
 * Thrown when circuit breaker is in OPEN state
 */
export class CircuitBreakerOpenException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenException';
  }
}
