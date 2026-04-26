import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BalanceService, BalanceResponse } from '../services/balance.service';
import {
  HCMClientException,
  HCMInvalidDimensionException,
  InsufficientBalanceException,
} from '../common/exceptions';

/**
 * BalanceController handles balance-related endpoints
 */
@Controller('balances')
@ApiTags('balances')
export class BalanceController {
  constructor(private balanceService: BalanceService) {}

  @Get(':employeeId/:locationId/:leaveType')
  @ApiOperation({ summary: 'Get employee balance for leave type' })
  @ApiResponse({
    status: 200,
    description: 'Balance retrieved successfully',
    schema: {
      example: {
        employeeId: 'emp001',
        locationId: 'NYC',
        leaveType: 'PTO',
        available: 10,
        used: 0,
        pending: 0,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Balance not found' })
  @ApiResponse({ status: 503, description: 'Service timeout' })
  async getBalance(
    @Param('employeeId') employeeId: string,
    @Param('locationId') locationId: string,
    @Param('leaveType') leaveType: string,
  ): Promise<BalanceResponse> {
    try {
      return await this.balanceService.getBalance(
        employeeId,
        locationId,
        leaveType,
      );
    } catch (error) {
      if (error instanceof HCMClientException) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof HCMInvalidDimensionException) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Post('sync')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Batch balance sync' })
  @ApiResponse({
    status: 202,
    description: 'Sync request accepted',
    schema: {
      example: {
        syncId: 'uuid-here',
        employeesProcessed: 3,
        balances: [
          {
            employeeId: 'emp001',
            locationId: 'NYC',
            leaveType: 'PTO',
            available: 10,
            used: 0,
            pending: 0,
          },
        ],
      },
    },
  })
  async batchSync(
    @Body() dto: { employees: { employeeId: string; locationId: string; leaveType: string }[] },
  ): Promise<any> {
    if (!dto.employees || !Array.isArray(dto.employees)) {
      throw new BadRequestException('employees array is required');
    }

    const balances = await this.balanceService.batchGetBalances(dto.employees);
    const balanceArray = Array.from(balances.values());

    return {
      syncId: require('uuid').v4(),
      employeesProcessed: dto.employees.length,
      balances: balanceArray,
      timestamp: new Date(),
    };
  }

  @Get('employee/:employeeId')
  @ApiOperation({ summary: 'Get all balances for an employee' })
  @ApiResponse({
    status: 200,
    description: 'All employee balances retrieved',
  })
  async getEmployeeBalances(
    @Param('employeeId') employeeId: string,
  ): Promise<BalanceResponse[]> {
    return this.balanceService.getEmployeeBalances(employeeId);
  }
}
