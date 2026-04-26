import { Injectable } from '@nestjs/common';
import {
  HCMTimeoutException,
  HCMClientException,
  HCMInvalidDimensionException,
  InsufficientBalanceException,
  CircuitBreakerOpenException,
} from '../common/exceptions';

export type BehaviorType =
  | 'NORMAL'
  | 'TIMEOUT'
  | 'PARTIAL_FAILURE'
  | 'DRIFT'
  | 'CIRCUIT_BREAKER'
  | 'INVALID_DIMENSION'
  | 'INSUFFICIENT_BALANCE';

/**
 * BehaviorEngine provides configurable failure injection for testing
 * 7 behaviors: NORMAL, TIMEOUT, PARTIAL_FAILURE, DRIFT, CIRCUIT_BREAKER, INVALID_DIMENSION, INSUFFICIENT_BALANCE
 */
@Injectable()
export class BehaviorEngine {
  private currentBehavior: BehaviorType = 'NORMAL';
  private failureCount = 0;
  private maxFailures = 5;
  private driftCounter = 0;

  /**
   * Execute an operation with current behavior applied
   */
  async executeWithBehavior<T>(operation: () => Promise<T>): Promise<T> {
    switch (this.currentBehavior) {
      case 'NORMAL':
        return this.normalBehavior(operation);
      case 'TIMEOUT':
        return this.timeoutBehavior(operation);
      case 'PARTIAL_FAILURE':
        return this.partialFailureBehavior(operation);
      case 'DRIFT':
        return this.driftBehavior(operation);
      case 'CIRCUIT_BREAKER':
        return this.circuitBreakerBehavior(operation);
      case 'INVALID_DIMENSION':
        // This is handled differently - throw directly
        throw new HCMInvalidDimensionException(
          'Invalid dimension combination',
        );
      case 'INSUFFICIENT_BALANCE':
        // This is handled differently - throw directly
        throw new InsufficientBalanceException(
          'Insufficient balance for request',
        );
      default:
        return this.normalBehavior(operation);
    }
  }

  /**
   * NORMAL: Success path - execute operation normally
   */
  private async normalBehavior<T>(operation: () => Promise<T>): Promise<T> {
    return operation();
  }

  /**
   * TIMEOUT: Delay response >6 seconds
   */
  private async timeoutBehavior<T>(operation: () => Promise<T>): Promise<T> {
    const delayMs = 6500; // 6.5 seconds
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return operation();
  }

  /**
   * PARTIAL_FAILURE: Fail first N calls, then succeed
   * Fails on calls 1-3, succeeds on call 4+
   */
  private async partialFailureBehavior<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    this.failureCount++;
    if (this.failureCount <= 3) {
      throw new HCMClientException('Partial failure: temporary error');
    }
    return operation();
  }

  /**
   * DRIFT: Return different balance each time
   * Simulates independent HCM changes
   */
  private async driftBehavior<T>(operation: () => Promise<T>): Promise<T> {
    const result = (await operation()) as any;
    if (
      result &&
      typeof result === 'object' &&
      'available' in result &&
      'used' in result
    ) {
      // Modify the balance to simulate drift
      this.driftCounter++;
      const driftAmount = this.driftCounter % 3; // 0, 1, or 2
      return {
        ...result,
        available: Math.max(0, result.available - driftAmount),
        driftSimulated: true,
      } as T;
    }
    return result;
  }

  /**
   * CIRCUIT_BREAKER: Fail first 5 calls consistently
   */
  private async circuitBreakerBehavior<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    this.failureCount++;
    if (this.failureCount <= this.maxFailures) {
      throw new CircuitBreakerOpenException('Circuit breaker: too many failures');
    }
    return operation();
  }

  /**
   * Validate dimensions - throw for invalid combinations in INVALID_DIMENSION mode
   */
  validateDimensionForBehavior(
    employeeId: string,
    locationId: string,
    leaveType: string,
  ): void {
    if (this.currentBehavior === 'INVALID_DIMENSION') {
      // Simulate invalid combinations: emp999, unknown location, or INVALID_TYPE
      if (
        employeeId === 'emp999' ||
        !['NYC', 'SF', 'LONDON'].includes(locationId) ||
        !['PTO', 'SICK_LEAVE', 'PERSONAL'].includes(leaveType)
      ) {
        throw new HCMInvalidDimensionException(
          `Invalid dimension: ${employeeId}/${locationId}/${leaveType}`,
        );
      }
    }
  }

  /**
   * Validate balance - throw for insufficient in INSUFFICIENT_BALANCE mode
   */
  validateBalanceForBehavior(
    requested: number,
    available: number,
  ): void {
    if (this.currentBehavior === 'INSUFFICIENT_BALANCE') {
      if (requested > available) {
        throw new InsufficientBalanceException(
          `Insufficient balance: requested ${requested}, available ${available}`,
        );
      }
    }
  }

  /**
   * Set current behavior
   */
  setBehavior(behavior: string): void {
    if (
      !['NORMAL', 'TIMEOUT', 'PARTIAL_FAILURE', 'DRIFT', 'CIRCUIT_BREAKER', 'INVALID_DIMENSION', 'INSUFFICIENT_BALANCE'].includes(
        behavior,
      )
    ) {
      throw new Error(`Unknown behavior: ${behavior}`);
    }
    this.currentBehavior = behavior as BehaviorType;
    this.failureCount = 0;
    this.driftCounter = 0;
  }

  /**
   * Reset to NORMAL behavior
   */
  resetBehavior(): void {
    this.currentBehavior = 'NORMAL';
    this.failureCount = 0;
    this.driftCounter = 0;
  }

  /**
   * Get current behavior state
   */
  getCurrentBehavior(): {
    behavior: BehaviorType;
    failureCount: number;
    driftCounter: number;
  } {
    return {
      behavior: this.currentBehavior,
      failureCount: this.failureCount,
      driftCounter: this.driftCounter,
    };
  }

  /**
   * Reset failure counts (useful after switching behaviors)
   */
  resetFailureCounters(): void {
    this.failureCount = 0;
    this.driftCounter = 0;
  }
}
