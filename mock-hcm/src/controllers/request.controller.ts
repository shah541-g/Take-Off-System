import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  BadRequestException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequestService, TimeOffRequest } from '../services/request.service';
import {
  InsufficientBalanceException,
  HCMInvalidDimensionException,
} from '../common/exceptions';

/**
 * RequestController handles time-off request endpoints
 */
@Controller('time-off-requests')
@ApiTags('time-off-requests')
export class RequestController {
  constructor(private requestService: RequestService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a time-off request' })
  @ApiResponse({
    status: 201,
    description: 'Request submitted successfully',
    schema: {
      example: {
        hcmRequestId: 'uuid-here',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 403, description: 'Insufficient balance' })
  @ApiResponse({ status: 404, description: 'Invalid dimension' })
  async submitRequest(
    @Body()
    dto: {
      employeeId: string;
      locationId: string;
      leaveType: string;
      requestedDays: number;
      startDate: string;
      endDate: string;
    },
  ): Promise<{ hcmRequestId: string }> {
    try {
      // Validate required fields
      if (!dto.employeeId || !dto.locationId || !dto.leaveType) {
        throw new BadRequestException('employeeId, locationId, and leaveType are required');
      }
      if (!dto.requestedDays || dto.requestedDays <= 0) {
        throw new BadRequestException('requestedDays must be a positive number');
      }
      if (!dto.startDate || !dto.endDate) {
        throw new BadRequestException('startDate and endDate are required');
      }

      return await this.requestService.submitTimeOffRequest(dto);
    } catch (error) {
      if (error instanceof InsufficientBalanceException) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof HCMInvalidDimensionException) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get(':requestId')
  @ApiOperation({ summary: 'Get request details' })
  @ApiResponse({
    status: 200,
    description: 'Request retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async getRequest(@Param('requestId') requestId: string): Promise<TimeOffRequest> {
    const request = this.requestService.getRequestById(requestId);
    if (!request) {
      throw new BadRequestException(`Request not found: ${requestId}`);
    }
    return request;
  }

  @Get()
  @ApiOperation({ summary: 'Get all requests' })
  @ApiResponse({
    status: 200,
    description: 'All requests retrieved',
  })
  async getAllRequests(): Promise<TimeOffRequest[]> {
    return this.requestService.getAllRequests();
  }

  @Get('employee/:employeeId')
  @ApiOperation({ summary: 'Get requests for specific employee' })
  @ApiResponse({
    status: 200,
    description: 'Employee requests retrieved',
  })
  async getEmployeeRequests(
    @Param('employeeId') employeeId: string,
  ): Promise<TimeOffRequest[]> {
    return this.requestService.getEmployeeRequests(employeeId);
  }
}
