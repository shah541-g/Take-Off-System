/**
 * HCM Retry Service
 * Implements exponential backoff retry logic for transient HCM failures
 * Error Classification:
 * - Transient errors (retry): Timeout, 502, 503, network errors
 * - Permanent errors (fail fast): 4xx errors, validation errors
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';

@Injectable()
export class HCMRetryService {
  private readonly logger = new Logger(HCMRetryService.name);
  private readonly maxRetries: number;
  private readonly initialDelayMs: number;
  private readonly backoffMultiplier: number;

  constructor(private readonly configService: ConfigService) {
    this.maxRetries = this.configService.get<number>('HCM_MAX_RETRIES') || 3;
    this.initialDelayMs = this.configService.get<number>('HCM_INITIAL_DELAY_MS') || 500;
    this.backoffMultiplier =
      this.configService.get<number>('HCM_BACKOFF_MULTIPLIER') || 1.5;
  }

  /**
   * Execute an operation with exponential backoff retry
   * Retry schedule:
   * - Attempt 1: immediate
   * - Attempt 2: 500ms
   * - Attempt 3: 1500ms (500 * 1.5^1)
   * - Attempt 4: 5000ms (500 * 1.5^2)
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.debug(
          `Executing operation "${operationName}" (attempt ${attempt + 1}/${this.maxRetries + 1})`,
        );
        return await operation();
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        lastError = err;

        // Check if error is permanent - fail immediately
        if (!this.isTransientError(error)) {
          this.logger.warn(
            `Permanent error in "${operationName}": ${err.message}`,
          );
          throw error;
        }

        // If this was the last attempt, throw
        if (attempt === this.maxRetries) {
          this.logger.error(
            `All ${this.maxRetries + 1} attempts failed for "${operationName}": ${err.message}`,
          );
          throw error;
        }

        // Calculate backoff and wait
        const delayMs = this.calculateBackoff(attempt);
        this.logger.debug(
          `Transient error in "${operationName}" (attempt ${attempt + 1}): ${err.message}. Retrying in ${delayMs}ms`,
        );

        await this.sleep(delayMs);
      }
    }

    // This should never be reached, but just in case
    throw lastError || new Error(`Failed after ${this.maxRetries + 1} attempts`);
  }

  /**
   * Classify if an error is transient (should retry) or permanent (should fail fast)
   *
   * Transient errors:
   * - Timeout errors (RequestTimeout, ETIMEDOUT, ECONNRESET)
   * - 502 Bad Gateway
   * - 503 Service Unavailable
   * - Network errors (ENOTFOUND, ECONNREFUSED)
   *
   * Permanent errors:
   * - 4xx client errors (except timeouts)
   * - 400 Bad Request
   * - 401 Unauthorized
   * - 403 Forbidden
   * - 404 Not Found
   * - 422 Unprocessable Entity
   */
  private isTransientError(error: any): boolean {
    // Handle Axios errors
    if (error.code) {
      const code = error.code.toUpperCase();
      // Network/timeout errors - transient
      if (
        code === 'ETIMEDOUT' ||
        code === 'ECONNRESET' ||
        code === 'ENOTFOUND' ||
        code === 'ECONNREFUSED' ||
        code === 'ECONNABORTED' ||
        code === 'ESOCKETTIMEDOUT'
      ) {
        return true;
      }
    }

    // Handle HTTP response errors
    if (error.response && error.response.status) {
      const status = error.response.status;

      // 5xx errors are transient
      if (status >= 500 && status < 600) {
        return true;
      }

      // 4xx errors are permanent (client errors)
      if (status >= 400 && status < 500) {
        return false;
      }
    }

    // Handle timeout errors by message
    if (error.message) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes('timeout') ||
        msg.includes('etimedout') ||
        msg.includes('econnreset') ||
        msg.includes('aborted')
      ) {
        return true;
      }
    }

    // Check for RxJS timeout error
    if (error.name === 'TimeoutError') {
      return true;
    }

    // Default to transient for unknown errors (better to retry than fail fast)
    this.logger.debug(
      `Unknown error type, treating as transient: ${error.message}`,
    );
    return true;
  }

  /**
   * Calculate exponential backoff delay
   * Formula: initialDelayMs * (backoffMultiplier ^ attemptNumber)
   * Examples with defaults:
   * - Attempt 0: 500ms * 1.5^0 = 500ms
   * - Attempt 1: 500ms * 1.5^1 = 750ms
   * - Attempt 2: 500ms * 1.5^2 = 1125ms (approx 1500ms)
   */
  private calculateBackoff(attemptNumber: number): number {
    const delayMs = Math.round(
      this.initialDelayMs * Math.pow(this.backoffMultiplier, attemptNumber),
    );
    return delayMs;
  }

  /**
   * Sleep utility function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
