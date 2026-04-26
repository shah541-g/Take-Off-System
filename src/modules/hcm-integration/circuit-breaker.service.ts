/**
 * Circuit Breaker Service
 * Implements the circuit breaker pattern to prevent cascading failures
 *
 * States:
 * - CLOSED: Normal operation, requests go through
 * - OPEN: Too many failures, requests fail fast without calling HCM
 * - HALF_OPEN: Testing if HCM has recovered after reset timeout
 *
 * Transitions:
 * - CLOSED -> OPEN: When failure count reaches threshold
 * - OPEN -> HALF_OPEN: After reset timeout expires
 * - HALF_OPEN -> CLOSED: If operation succeeds
 * - HALF_OPEN -> OPEN: If operation fails
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export class CircuitBreakerOpenException extends Error {
  constructor(message: string = 'Circuit breaker is open') {
    super(message);
    this.name = 'CircuitBreakerOpenException';
  }
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: Date | null;
  consecutiveSuccesses: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);

  // State management
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private consecutiveSuccesses = 0;
  private lastFailureTime: Date | null = null;

  // Configuration
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly successThresholdForHalfOpen = 1; // Close after 1 success in HALF_OPEN

  constructor(private readonly configService: ConfigService) {
    this.failureThreshold =
      this.configService.get<number>('CIRCUIT_BREAKER_FAILURE_THRESHOLD') || 5;
    this.resetTimeoutMs =
      this.configService.get<number>('CIRCUIT_BREAKER_RESET_TIMEOUT_MS') || 60000;

    this.logger.log(
      `Circuit breaker initialized: threshold=${this.failureThreshold}, resetTimeout=${this.resetTimeoutMs}ms`,
    );
  }

  /**
   * Execute an operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit should transition to HALF_OPEN
    this.tryReset();

    // If circuit is OPEN, fail fast
    if (this.state === 'OPEN') {
      this.logger.warn(
        `Circuit breaker is OPEN. Rejecting request. Failures: ${this.failureCount}`,
      );
      throw new CircuitBreakerOpenException(
        `Circuit breaker is open after ${this.failureCount} failures`,
      );
    }

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Get current circuit breaker state for health checks
   */
  getState(): CircuitBreakerState {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      consecutiveSuccesses: this.consecutiveSuccesses,
    };
  }

  /**
   * Reset circuit breaker to CLOSED state (useful for testing)
   */
  reset(): void {
    this.logger.log('Circuit breaker manually reset to CLOSED');
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = null;
  }

  /**
   * Record a successful operation
   * - In CLOSED state: nothing to do
   * - In HALF_OPEN state: close the circuit if threshold reached
   */
  private recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.consecutiveSuccesses++;
      this.logger.debug(
        `Success in HALF_OPEN state. Consecutive successes: ${this.consecutiveSuccesses}`,
      );

      if (this.consecutiveSuccesses >= this.successThresholdForHalfOpen) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.consecutiveSuccesses = 0;
        this.lastFailureTime = null;
        this.logger.log(
          'Circuit breaker transitioned from HALF_OPEN to CLOSED',
        );
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on each success in CLOSED state (optional, but good practice)
      if (this.failureCount > 0) {
        this.failureCount = 0;
        this.logger.debug('Failure count reset to 0 after successful operation');
      }
    }
  }

  /**
   * Record a failed operation
   * - Increment failure count
   * - Open circuit if threshold reached
   * - In HALF_OPEN state: immediately return to OPEN
   */
  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    this.consecutiveSuccesses = 0;

    this.logger.warn(
      `Operation failed. Failure count: ${this.failureCount}/${this.failureThreshold}`,
    );

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.logger.warn('Circuit breaker transitioned from HALF_OPEN back to OPEN');
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.logger.error(
        `Circuit breaker transitioned to OPEN after ${this.failureCount} failures`,
      );
    }
  }

  /**
   * Try to transition from OPEN to HALF_OPEN state
   * Happens when reset timeout expires after a failure
   */
  private tryReset(): void {
    if (this.state === 'OPEN' && this.lastFailureTime) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();

      if (timeSinceLastFailure >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.consecutiveSuccesses = 0;
        this.logger.log(
          `Circuit breaker transitioned from OPEN to HALF_OPEN. Testing recovery...`,
        );
      }
    }
  }
}
