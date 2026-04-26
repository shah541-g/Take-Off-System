/**
 * HCM Integration Module
 * Provides HCM client, retry logic, circuit breaker, and health monitoring
 * Exports: HCMClient, CircuitBreakerService, HealthCheckService
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { HCMClient } from './hcm-client';
import { HCMRetryService } from './hcm-retry.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { HealthCheckService } from './health-check.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [HCMClient, HCMRetryService, CircuitBreakerService, HealthCheckService],
  exports: [HCMClient, CircuitBreakerService, HealthCheckService, HCMRetryService],
})
export class HCMModule {}
