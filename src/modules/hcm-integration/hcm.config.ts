/**
 * HCM Integration Configuration
 * Centralized configuration for HCM client, retry logic, and circuit breaker
 */

export interface HCMConfig {
  baseUrl: string;
  timeout: number; // milliseconds
  maxRetries: number;
  initialDelayMs: number;
  retryBackoffMultiplier: number;
  circuitBreakerFailureThreshold: number;
  circuitBreakerResetTimeoutMs: number;
}

export const hcmConfig: HCMConfig = {
  baseUrl: process.env.HCM_BASE_URL || 'http://localhost:3001',
  timeout: parseInt(process.env.HCM_TIMEOUT || '5000', 10), // 5 seconds
  maxRetries: parseInt(process.env.HCM_MAX_RETRIES || '3', 10),
  initialDelayMs: parseInt(process.env.HCM_INITIAL_DELAY_MS || '500', 10), // 500ms
  retryBackoffMultiplier: parseFloat(process.env.HCM_BACKOFF_MULTIPLIER || '1.5'),
  circuitBreakerFailureThreshold: parseInt(
    process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5',
    10,
  ),
  circuitBreakerResetTimeoutMs: parseInt(
    process.env.CIRCUIT_BREAKER_RESET_TIMEOUT_MS || '60000',
    10,
  ), // 60 seconds
};
