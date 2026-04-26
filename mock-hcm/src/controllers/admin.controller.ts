import {
  Controller,
  Post,
  Get,
  Body,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BehaviorEngine, BehaviorType } from '../services/behavior-engine.service';
import { BalanceService } from '../services/balance.service';
import { RequestService } from '../services/request.service';

/**
 * AdminController provides administrative endpoints for testing and debugging
 */
@Controller('admin')
@ApiTags('admin')
export class AdminController {
  constructor(
    private balanceService: BalanceService,
    private behaviorEngine: BehaviorEngine,
    private requestService: RequestService,
  ) {}

  @Post('reset-behavior')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset behavior to NORMAL' })
  @ApiResponse({
    status: 200,
    description: 'Behavior reset successfully',
    schema: {
      example: {
        message: 'Behavior reset to NORMAL',
        behavior: 'NORMAL',
      },
    },
  })
  async resetBehavior(): Promise<{ message: string; behavior: string }> {
    this.behaviorEngine.resetBehavior();
    return {
      message: 'Behavior reset to NORMAL',
      behavior: 'NORMAL',
    };
  }

  @Post('set-behavior')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set behavior for failure injection' })
  @ApiResponse({
    status: 200,
    description: 'Behavior set successfully',
    schema: {
      example: {
        message: 'Behavior set to TIMEOUT',
        behavior: 'TIMEOUT',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid behavior',
  })
  async setBehavior(
    @Body() dto: { behavior: string },
  ): Promise<{ message: string; behavior: string }> {
    if (!dto.behavior) {
      throw new BadRequestException('behavior field is required');
    }

    const validBehaviors = [
      'NORMAL',
      'TIMEOUT',
      'PARTIAL_FAILURE',
      'DRIFT',
      'CIRCUIT_BREAKER',
      'INVALID_DIMENSION',
      'INSUFFICIENT_BALANCE',
    ];

    if (!validBehaviors.includes(dto.behavior)) {
      throw new BadRequestException(
        `Invalid behavior. Valid options: ${validBehaviors.join(', ')}`,
      );
    }

    this.behaviorEngine.setBehavior(dto.behavior);
    return {
      message: `Behavior set to ${dto.behavior}`,
      behavior: dto.behavior,
    };
  }

  @Post('update-balance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually update balance (admin)' })
  @ApiResponse({
    status: 200,
    description: 'Balance updated successfully',
    schema: {
      example: {
        message: 'Balance updated',
        employeeId: 'emp001',
        locationId: 'NYC',
        leaveType: 'PTO',
        available: 10,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  async updateBalance(
    @Body()
    dto: {
      employeeId: string;
      locationId: string;
      leaveType: string;
      available?: number;
      used?: number;
      pending?: number;
    },
  ): Promise<any> {
    if (!dto.employeeId || !dto.locationId || !dto.leaveType) {
      throw new BadRequestException(
        'employeeId, locationId, and leaveType are required',
      );
    }

    try {
      await this.balanceService.updateBalance(dto.employeeId, dto.locationId, dto.leaveType, {
        available: dto.available,
        used: dto.used,
        pending: dto.pending,
      });

      const updated = await this.balanceService.getBalance(
        dto.employeeId,
        dto.locationId,
        dto.leaveType,
      );

      return {
        message: 'Balance updated',
        ...updated,
      };
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Error updating balance');
    }
  }

  @Get('state')
  @ApiOperation({ summary: 'Get current HCM server state' })
  @ApiResponse({
    status: 200,
    description: 'Server state retrieved',
    schema: {
      example: {
        currentBehavior: 'NORMAL',
        failureCount: 0,
        driftCounter: 0,
        totalBalances: 20,
        totalRequests: 5,
        timestamp: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  async getState(): Promise<any> {
    const behaviorState = this.behaviorEngine.getCurrentBehavior();
    const allBalances = this.balanceService.getAllBalances();
    const allRequests = this.requestService.getAllRequests();

    return {
      currentBehavior: behaviorState.behavior,
      failureCount: behaviorState.failureCount,
      driftCounter: behaviorState.driftCounter,
      totalBalances: allBalances.length,
      totalRequests: allRequests.length,
      balances: allBalances.map((b) => ({
        employeeId: b.employeeId,
        locationId: b.locationId,
        leaveType: b.leaveType,
        available: b.available,
        used: b.used,
        pending: b.pending,
      })),
      recentRequests: allRequests.slice(-5),
      timestamp: new Date().toISOString(),
    };
  }

  @Post('reset-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset all data to seed values (admin)' })
  @ApiResponse({
    status: 200,
    description: 'All data reset to seed values',
    schema: {
      example: {
        message: 'All data reset to seed values',
        behavior: 'NORMAL',
      },
    },
  })
  async resetAll(): Promise<{ message: string; behavior: string }> {
    this.behaviorEngine.resetBehavior();
    this.balanceService.resetToSeedData();
    this.requestService.resetRequests();
    return {
      message: 'All data reset to seed values',
      behavior: 'NORMAL',
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Mock HCM server is healthy',
    schema: {
      example: {
        status: 'healthy',
        service: 'Mock HCM',
        timestamp: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  async health(): Promise<any> {
    return {
      status: 'healthy',
      service: 'Mock HCM',
      timestamp: new Date().toISOString(),
    };
  }
}
