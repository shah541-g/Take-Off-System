import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
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
import { TimeOffRequestService } from './requests.service';
import {
  CreateRequestDto,
  ApproveRequestDto,
  RejectRequestDto,
  CancelRequestDto,
} from '../../dto';

/**
 * RequestsController
 * API endpoints for time-off request management
 */
@Controller('api/v1/requests')
@ApiTags('Time-Off Requests')
export class RequestsController {
  private readonly logger = new Logger(RequestsController.name);

  constructor(private readonly requestsService: TimeOffRequestService) {}

  /**
   * Create a new time-off request
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new time-off request' })
  @ApiResponse({
    status: 201,
    description: 'Request created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or dimension validation failed',
  })
  @ApiResponse({
    status: 409,
    description: 'Insufficient balance',
  })
  async createRequest(@Body() dto: CreateRequestDto) {
    this.logger.debug(`Creating request for employee ${dto.employeeId}`);
    return await this.requestsService.createRequest(dto);
  }

  /**
   * Get request details by ID
   */
  @Get(':requestId')
  @ApiOperation({ summary: 'Get request details' })
  @ApiParam({ name: 'requestId', description: 'Request ID' })
  @ApiResponse({
    status: 200,
    description: 'Request found',
  })
  @ApiResponse({
    status: 404,
    description: 'Request not found',
  })
  async getRequest(@Param('requestId') requestId: string) {
    this.logger.debug(`Retrieving request ${requestId}`);
    return await this.requestsService.getRequest(requestId);
  }

  /**
   * Approve a pending time-off request
   */
  @Patch(':requestId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a time-off request' })
  @ApiParam({ name: 'requestId', description: 'Request ID' })
  @ApiResponse({
    status: 200,
    description: 'Request approved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Request not found',
  })
  @ApiResponse({
    status: 408,
    description: 'HCM timeout',
  })
  @ApiResponse({
    status: 409,
    description: 'Insufficient balance or invalid state transition',
  })
  @ApiResponse({
    status: 503,
    description: 'Circuit breaker open',
  })
  async approveRequest(
    @Param('requestId') requestId: string,
    @Body() dto: ApproveRequestDto,
  ) {
    this.logger.debug(`Approving request ${requestId}`);
    return await this.requestsService.approveRequest(requestId, dto);
  }

  /**
   * Reject a pending time-off request
   */
  @Patch(':requestId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a time-off request' })
  @ApiParam({ name: 'requestId', description: 'Request ID' })
  @ApiResponse({
    status: 200,
    description: 'Request rejected successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Request not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Invalid state transition',
  })
  async rejectRequest(
    @Param('requestId') requestId: string,
    @Body() dto: RejectRequestDto,
  ) {
    this.logger.debug(`Rejecting request ${requestId}`);
    return await this.requestsService.rejectRequest(requestId, dto.reason);
  }

  /**
   * Cancel a time-off request (employee cancellation)
   */
  @Patch(':requestId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a time-off request' })
  @ApiParam({ name: 'requestId', description: 'Request ID' })
  @ApiResponse({
    status: 200,
    description: 'Request cancelled successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Request not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Invalid state transition',
  })
  async cancelRequest(
    @Param('requestId') requestId: string,
    @Body() dto: CancelRequestDto,
  ) {
    this.logger.debug(`Cancelling request ${requestId}`);
    return await this.requestsService.cancelRequest(requestId, dto.reason);
  }

  /**
   * Get all requests for an employee
   */
  @Get('employee/:employeeId')
  @ApiOperation({ summary: 'Get all requests for an employee' })
  @ApiParam({ name: 'employeeId', description: 'Employee ID' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by request status',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    description: 'Filter by year',
  })
  @ApiResponse({
    status: 200,
    description: 'List of requests',
  })
  async getEmployeeRequests(
    @Param('employeeId') employeeId: string,
    @Query() filters: any,
  ) {
    this.logger.debug(`Retrieving requests for employee ${employeeId}`);
    return await this.requestsService.getRequestsByEmployee(
      employeeId,
      filters,
    );
  }
}
