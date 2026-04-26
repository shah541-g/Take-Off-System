import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HCMModule } from '../hcm-integration/hcm.module';

/**
 * HealthModule
 * Provides health check endpoints and monitoring
 */
@Module({
  imports: [HCMModule],
  controllers: [HealthController],
})
export class HealthModule {}
