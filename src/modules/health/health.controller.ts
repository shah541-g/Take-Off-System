import { Controller, Get, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheckService } from '../hcm-integration/health-check.service';

/**
 * HealthController
 * API endpoint for system health status
 */
@Controller('health')
@ApiTags('Health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly healthCheckService: HealthCheckService) {}

  /**
   * Get system health status
   */
  @Get()
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved',
    schema: {
      properties: {
        status: {
          type: 'string',
          enum: ['UP', 'DEGRADED', 'DOWN'],
        },
        hcm: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            circuitBreakerState: { type: 'string' },
            failureCount: { type: 'number' },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getHealth() {
    this.logger.debug('Health check requested');
    const hcmHealth = await this.healthCheckService.checkHCMHealth();
    
    return {
      status: hcmHealth.status,
      hcm: {
        status: hcmHealth.status,
        state: hcmHealth.circuitBreakerState,
        failureCount: hcmHealth.failureCount,
        lastSuccessfulCheck: hcmHealth.lastSuccessfulCheck,
        lastFailedCheck: hcmHealth.lastFailedCheck,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
