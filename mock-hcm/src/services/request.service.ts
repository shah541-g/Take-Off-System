import { Injectable } from '@nestjs/common';
import { BehaviorEngine } from './behavior-engine.service';
import { BalanceService } from './balance.service';
import { v4 as uuid } from 'uuid';
import {
  InsufficientBalanceException,
  HCMInvalidDimensionException,
} from '../common/exceptions';

export interface TimeOffRequest {
  hcmRequestId: string;
  employeeId: string;
  locationId: string;
  leaveType: string;
  requestedDays: number;
  startDate: Date;
  endDate: Date;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PENDING';
  submittedAt: Date;
  approvedAt?: Date;
}

/**
 * RequestService manages time-off requests
 */
@Injectable()
export class RequestService {
  private requests: TimeOffRequest[] = [];

  constructor(
    private behaviorEngine: BehaviorEngine,
    private balanceService: BalanceService,
  ) {}

  /**
   * Submit a time-off request
   */
  async submitTimeOffRequest(requestData: {
    employeeId: string;
    locationId: string;
    leaveType: string;
    requestedDays: number;
    startDate: string;
    endDate: string;
  }): Promise<{ hcmRequestId: string }> {
    // Validate dimensions
    const isValidDimension = await this.balanceService.validateDimensions(
      requestData.employeeId,
      requestData.locationId,
      requestData.leaveType,
    );

    if (!isValidDimension) {
      throw new HCMInvalidDimensionException(
        `Invalid dimension: ${requestData.employeeId}/${requestData.locationId}/${requestData.leaveType}`,
      );
    }

    // Check balance
    const balance = await this.balanceService.getBalance(
      requestData.employeeId,
      requestData.locationId,
      requestData.leaveType,
    );

    // Validate balance for insufficient behavior
    this.behaviorEngine.validateBalanceForBehavior(
      requestData.requestedDays,
      balance.available,
    );

    // Check if enough balance available
    if (requestData.requestedDays > balance.available) {
      throw new InsufficientBalanceException(
        `Insufficient balance: requested ${requestData.requestedDays}, available ${balance.available}`,
      );
    }

    // Create request
    const hcmRequestId = uuid();
    const request: TimeOffRequest = {
      hcmRequestId,
      employeeId: requestData.employeeId,
      locationId: requestData.locationId,
      leaveType: requestData.leaveType,
      requestedDays: requestData.requestedDays,
      startDate: new Date(requestData.startDate),
      endDate: new Date(requestData.endDate),
      status: 'PENDING',
      submittedAt: new Date(),
    };

    this.requests.push(request);

    return { hcmRequestId };
  }

  /**
   * Get request by ID
   */
  getRequestById(hcmRequestId: string): TimeOffRequest | undefined {
    return this.requests.find((r) => r.hcmRequestId === hcmRequestId);
  }

  /**
   * Get all requests
   */
  getAllRequests(): TimeOffRequest[] {
    return this.requests;
  }

  /**
   * Get requests for employee
   */
  getEmployeeRequests(employeeId: string): TimeOffRequest[] {
    return this.requests.filter((r) => r.employeeId === employeeId);
  }

  /**
   * Approve request (admin)
   */
  approveRequest(hcmRequestId: string): TimeOffRequest {
    const request = this.requests.find((r) => r.hcmRequestId === hcmRequestId);
    if (!request) {
      throw new Error(`Request not found: ${hcmRequestId}`);
    }

    request.status = 'APPROVED';
    request.approvedAt = new Date();
    return request;
  }

  /**
   * Reject request (admin)
   */
  rejectRequest(hcmRequestId: string): TimeOffRequest {
    const request = this.requests.find((r) => r.hcmRequestId === hcmRequestId);
    if (!request) {
      throw new Error(`Request not found: ${hcmRequestId}`);
    }

    request.status = 'REJECTED';
    return request;
  }

  /**
   * Reset all requests
   */
  resetRequests(): void {
    this.requests = [];
  }
}
