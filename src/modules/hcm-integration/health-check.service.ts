/**
 * Health Check Service
 * Monitors HCM health and integration status
 * Integrates with circuit breaker to provide system status
 */

import { Injectable, Logger } from '@nestjs/common';
import { HCMClient } from './hcm-client';
import { CircuitBreakerService } from './circuit-breaker.service';
import { HCMRetryService } from './hcm-retry.service';

export interface HCMHealthStatus {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  circuitBreakerState: string;
  lastSuccessfulCheck: Date | null;
  lastFailedCheck: Date | null;
  failureCount: number;
  failureReason?: string;
}

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private lastSuccessfulCheck: Date | null = null;
  private lastFailedCheck: Date | null = null;
  private failureReason: string | null = null;

  constructor(
    private readonly hcmClient: HCMClient,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly retryService: HCMRetryService,
  ) {}

  /**
   * Check HCM health status
   * Attempts a simple balance query to verify HCM is responding
   */
  async checkHCMHealth(): Promise<HCMHealthStatus> {
    this.logger.debug('Starting HCM health check...');

    const cbState = this.circuitBreaker.getState();
    const state = cbState.state;

    // If circuit breaker is OPEN, HCM is considered DOWN
    if (state === 'OPEN') {
      this.lastFailedCheck = new Date();
      this.failureReason = `Circuit breaker is OPEN. Failures: ${cbState.failureCount}`;

      this.logger.warn(`HCM health check failed: ${this.failureReason}`);

      return {
        status: 'DOWN',
        circuitBreakerState: state,
        lastSuccessfulCheck: this.lastSuccessfulCheck,
        lastFailedCheck: this.lastFailedCheck,
        failureCount: cbState.failureCount,
        failureReason: this.failureReason,
      };
    }

    // Attempt a health check with retry logic
    try {
      await this.retryService.executeWithRetry(
        async () => {
          // Use the dedicated HCM health endpoint so the check is non-invasive
          // and does not depend on fixture data or valid dimensions.
          const health = await this.hcmClient.pingHealth();
          return health.status === 'healthy' || health.status === 'ok' || health.status === 'up';
        },
        'HCM health check',
      );

      this.lastSuccessfulCheck = new Date();
      this.failureReason = null;

      this.logger.debug('HCM health check passed');

      return {
        status: 'UP',
        circuitBreakerState: state,
        lastSuccessfulCheck: this.lastSuccessfulCheck,
        lastFailedCheck: this.lastFailedCheck,
        failureCount: cbState.failureCount,
      };
    } catch (error) {
      this.lastFailedCheck = new Date();
      this.failureReason =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`HCM health check failed: ${this.failureReason}`);

      // Determine if DEGRADED or DOWN
      const isCircuitBreakerHalfOpen = state === 'HALF_OPEN';
      const status = isCircuitBreakerHalfOpen ? 'DEGRADED' : 'DOWN';

      return {
        status,
        circuitBreakerState: state,
        lastSuccessfulCheck: this.lastSuccessfulCheck,
        lastFailedCheck: this.lastFailedCheck,
        failureCount: cbState.failureCount,
        failureReason: this.failureReason ?? undefined,
      };
    }
  }

  /**
   * Get last known health status without performing a check
   */
  getLastHealthStatus(): HCMHealthStatus {
    const cbState = this.circuitBreaker.getState();
    const isHealthy = this.lastSuccessfulCheck && !this.lastFailedCheck;

    return {
      status: isHealthy ? 'UP' : 'DOWN',
      circuitBreakerState: cbState.state,
      lastSuccessfulCheck: this.lastSuccessfulCheck,
      lastFailedCheck: this.lastFailedCheck,
      failureCount: cbState.failureCount,
      failureReason: this.failureReason ?? undefined,
    };
  }
}
