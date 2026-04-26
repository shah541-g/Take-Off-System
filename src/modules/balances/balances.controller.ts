import {
  Controller,
  Get,
  Param,
  Query,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { BalancesService } from './balances.service';

/**
 * BalancesController
 * API endpoints for balance queries and management
 */
@Controller('api/v1/balances')
@ApiTags('Balances')
export class BalancesController {
  private readonly logger = new Logger(BalancesController.name);

  constructor(private readonly balancesService: BalancesService) {}

  /**
   * Get balance for a specific employee, location, and leave type
   */
  @Get(':employeeId/:locationId/:leaveType')
  @ApiOperation({ summary: 'Get balance for employee' })
  @ApiParam({ name: 'employeeId', description: 'Employee ID' })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiParam({ name: 'leaveType', description: 'Type of leave' })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Balance year (defaults to current year)',
  })
  @ApiResponse({
    status: 200,
    description: 'Balance retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid dimension',
  })
  @ApiResponse({
    status: 404,
    description: 'Balance not found',
  })
  async getBalance(
    @Param('employeeId') employeeId: string,
    @Param('locationId') locationId: string,
    @Param('leaveType') leaveType: string,
    @Query('year') year?: string,
  ) {
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    this.logger.debug(
      `Retrieving balance for ${employeeId}/${locationId}/${leaveType} (year: ${yearNum})`,
    );
    return await this.balancesService.getBalance(
      employeeId,
      locationId,
      leaveType,
      yearNum,
    );
  }

  /**
   * Get all balances for an employee
   */
  @Get(':employeeId')
  @ApiOperation({ summary: 'Get all balances for an employee' })
  @ApiParam({ name: 'employeeId', description: 'Employee ID' })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Filter by year (defaults to current year)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of balances',
  })
  @ApiResponse({
    status: 404,
    description: 'Employee not found',
  })
  async getAllBalances(
    @Param('employeeId') employeeId: string,
    @Query('year') year?: string,
  ) {
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    this.logger.debug(
      `Retrieving all balances for employee ${employeeId} (year: ${yearNum})`,
    );
    
    // Get all unique leave types and locations for this employee
    // This would require a method that retrieves all balances
    // For now, return a placeholder that would be implemented in BalancesService
    // TODO: Implement getAllBalancesForEmployee in BalancesService
    return [];
  }
}
