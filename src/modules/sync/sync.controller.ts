import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { BatchSyncDto, EmployeeDimensionDto } from '../../dto';

/**
 * SyncController
 * API endpoints for balance synchronization and drift detection
 * Admin/internal use only
 */
@Controller('api/v1/admin/sync')
@ApiTags('Sync & Admin')
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(private readonly syncService: SyncService) {}

  /**
   * Trigger batch balance synchronization
   */
  @Post('balances')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger batch balance synchronization' })
  @ApiResponse({
    status: 202,
    description: 'Sync job accepted and queued',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input',
  })
  @ApiResponse({
    status: 503,
    description: 'HCM service unavailable',
  })
  async triggerSync(@Body() dto: BatchSyncDto) {
    this.logger.debug(
      `Triggering batch sync for ${dto.employees.length} employees`,
    );
    return await this.syncService.batchSyncBalances(dto);
  }

  /**
   * Get synchronization status by sync ID
   */
  @Get(':syncId')
  @ApiOperation({ summary: 'Get synchronization status' })
  @ApiParam({ name: 'syncId', description: 'Sync operation ID' })
  @ApiResponse({
    status: 200,
    description: 'Sync status retrieved',
  })
  @ApiResponse({
    status: 404,
    description: 'Sync ID not found',
  })
  async getSyncStatus(@Param('syncId') syncId: string) {
    this.logger.debug(`Retrieving sync status: ${syncId}`);
    return await this.syncService.getSyncStatus(syncId);
  }

  /**
   * Detect balance drift for employees
   */
  @Post('detect-drift')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Detect balance drift for employees' })
  @ApiResponse({
    status: 200,
    description: 'Drift detection completed',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input',
  })
  @ApiResponse({
    status: 503,
    description: 'HCM service unavailable',
  })
  async detectDrift(@Body() employees: EmployeeDimensionDto[]) {
    this.logger.debug(`Detecting drift for ${employees.length} employees`);
    if (employees.length === 0) {
      return { hasDrift: false };
    }

    const first = employees[0];
    return await this.syncService.detectDrift(
      first.employeeId,
      first.locationId,
      first.leaveType,
      new Date().getFullYear(),
    );
  }
}
