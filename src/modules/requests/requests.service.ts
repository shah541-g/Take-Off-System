import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { OptimisticLockVersionMismatchError } from 'typeorm';
import { Request } from '../../entities/request.entity';
import { RequestsRepository } from '../../repositories/requests.repository';
import { BalancesService } from '../balances/balances.service';
import { AuditService } from '../audit/audit.service';
import { CreateRequestDto } from '../../dto/create-request.dto';
import { ApproveRequestDto } from '../../dto/approve-request.dto';
import { BalanceSnapshotDto } from '../../dto/balance-snapshot.dto';
import {
  InvalidStateTransitionException,
  NotFoundException,
} from '../../common/exceptions';

// Maximum number of times to retry an approval if a concurrent update is detected
const OPTIMISTIC_LOCK_MAX_RETRIES = 3;

/**
 * TimeOffRequestService
 * Core service managing the complete lifecycle of time-off requests.
 * Handles creation, approval, rejection, and cancellation with proper
 * state transitions.
 *
 * Concurrency strategy: SQLite does not support pessimistic locking so we
 * rely on the @VersionColumn() on the Request entity (optimistic locking).
 * TypeORM checks the version on every save() — if the row was modified by
 * another process between our read and our write it throws
 * OptimisticLockVersionMismatchError. approveRequest() catches this and
 * retries up to OPTIMISTIC_LOCK_MAX_RETRIES times before giving up.
 */
@Injectable()
export class TimeOffRequestService {
  private readonly logger = new Logger(TimeOffRequestService.name);

  constructor(
    private readonly requestsRepository: RequestsRepository,
    private readonly balancesService: BalancesService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create a new time-off request.
   * Validates dimensions and balance before creation.
   * Stores a snapshot of current balance with the request.
   * @param dto - Request creation details
   * @returns Created request entity
   * @throws DimensionValidationException if dimensions invalid
   * @throws InsufficientBalanceException if insufficient balance
   */
  async createRequest(dto: CreateRequestDto): Promise<Request> {
    this.logger.debug(
      `Creating request for employee ${dto.employeeId}: ${dto.daysRequested} days of ${dto.leaveType}`,
    );

    try {
      // Validate dimensions first
      await this.balancesService.validateDimensions(
        dto.employeeId,
        dto.locationId,
        dto.leaveType,
        new Date().getFullYear(),
      );

      // Validate balance
      await this.balancesService.validateBalance(
        dto.employeeId,
        dto.locationId,
        dto.leaveType,
        dto.daysRequested,
        new Date().getFullYear(),
      );

      // Get current balance for snapshot
      const currentBalance = await this.balancesService.getBalance(
        dto.employeeId,
        dto.locationId,
        dto.leaveType,
        new Date().getFullYear(),
      );

      // Create balance snapshot
      const snapshot: BalanceSnapshotDto = {
        availableBalance: currentBalance.available_balance,
        usedBalance: currentBalance.used_balance,
        carryoverBalance: currentBalance.carryover_balance,
        version: currentBalance.version,
        snapshotAt: new Date(),
      };

      // Create request entity
      const request = new Request();
      request.employee_id = dto.employeeId;
      request.location_id = dto.locationId;
      request.leave_type = dto.leaveType;
      request.start_date = dto.startDate;
      request.end_date = dto.endDate;
      request.days_requested = dto.daysRequested.toFixed(2);
      request.status = 'PENDING';
      request.balance_snapshot = JSON.stringify(snapshot);
      request.submitted_at = new Date();
      request.hcm_sync_status = 'PENDING';

      // Save request
      const saved = await this.requestsRepository.save(request);

      // Log audit event
      await this.auditService.logChange({
        entityType: 'REQUEST',
        entityId: saved.id,
        action: 'CREATE',
        newValue: {
          employee_id: saved.employee_id,
          leave_type: saved.leave_type,
          days_requested: saved.days_requested,
          status: saved.status,
        },
        reason: 'New time-off request created',
      });

      this.logger.debug(`Request created: ${saved.id}`);

      return saved;
    } catch (error) {
      this.logger.error(
        `Failed to create request: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Retrieve a time-off request by ID.
   * @param requestId - Request ID
   * @returns Request entity
   * @throws NotFoundException if request not found
   */
  async getRequest(requestId: string): Promise<Request> {
    this.logger.debug(`Retrieving request: ${requestId}`);

    const request = await this.requestsRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      this.logger.warn(`Request not found: ${requestId}`);
      throw new NotFoundException('Request', requestId);
    }

    return request;
  }

  /**
   * Approve a pending time-off request.
   *
   * Uses optimistic locking (via @VersionColumn on Request) instead of
   * pessimistic locking because SQLite does not support SELECT ... FOR UPDATE.
   *
   * Flow:
   *   1. Read the request (version N is loaded with the entity).
   *   2. Refresh balance from HCM and re-validate.
   *   3. Mutate and call save() — TypeORM issues:
   *        UPDATE requests SET ... WHERE id = ? AND version = N
   *      and then increments version to N+1.
   *   4. If another process updated the row first, version no longer matches
   *      and TypeORM throws OptimisticLockVersionMismatchError.
   *   5. We catch that error and retry from step 1 up to MAX_RETRIES times.
   *
   * @param requestId - Request ID
   * @param approverDto - Approval details
   * @returns Updated request entity
   * @throws NotFoundException if request not found
   * @throws InvalidStateTransitionException if not in PENDING status
   * @throws InsufficientBalanceException if balance insufficient
   * @throws BadRequestException if optimistic lock retries exhausted
   */
  async approveRequest(
    requestId: string,
    approverDto: ApproveRequestDto,
  ): Promise<Request> {
    this.logger.debug(`Approving request: ${requestId}`);

    let attempt = 0;

    while (attempt < OPTIMISTIC_LOCK_MAX_RETRIES) {
      attempt++;

      try {
        // Read request — @VersionColumn value is loaded automatically
        const request = await this.requestsRepository.findWithLock(requestId);

        if (!request) {
          throw new NotFoundException('Request', requestId);
        }

        // Validate state transition
        if (request.status !== 'PENDING') {
          throw new InvalidStateTransitionException(
            `Invalid transition for ${requestId}: ${request.status} -> APPROVED`,
          );
        }

        // CRITICAL: Real-time HCM sync to get fresh balance before deducting
        await this.balancesService.refreshBalance(
          request.employee_id,
          request.location_id,
          request.leave_type,
          new Date().getFullYear(),
        );

        // Re-validate balance with fresh data
        await this.balancesService.validateBalance(
          request.employee_id,
          request.location_id,
          request.leave_type,
          parseFloat(request.days_requested),
          new Date().getFullYear(),
        );

        // Mutate request
        request.status = 'APPROVED';
        request.approved_at = new Date();
        request.hcm_sync_status = 'SYNCED';

        // Deduct days from balance
        await this.balancesService.updateUsedBalance(
          request.employee_id,
          request.location_id,
          request.leave_type,
          parseFloat(request.days_requested),
        );

        // save() checks AND version = N under the hood — throws if stale
        const updated = await this.requestsRepository.save(request);

        // Audit log after successful save
        await this.auditService.logChange({
          entityType: 'REQUEST',
          entityId: updated.id,
          action: 'SYNC',
          oldValue: { status: 'PENDING' },
          newValue: { status: 'APPROVED' },
          reason: `Request approved by ${approverDto.approverId || 'system'}, HCM synced`,
          performedBy: approverDto.approverId,
        });

        this.logger.debug(`Request approved: ${updated.id}`);

        return updated;
      } catch (error) {
        // Concurrent update detected — retry with a fresh read
        if (error instanceof OptimisticLockVersionMismatchError) {
          this.logger.warn(
            `Optimistic lock conflict on ${requestId} (attempt ${attempt}/${OPTIMISTIC_LOCK_MAX_RETRIES}), retrying...`,
          );

          if (attempt >= OPTIMISTIC_LOCK_MAX_RETRIES) {
            this.logger.error(
              `Optimistic lock retries exhausted for request: ${requestId}`,
            );
            throw new BadRequestException(
              `Request ${requestId} is being modified concurrently. Please try again.`,
            );
          }

          // Brief back-off before retrying
          await new Promise((resolve) =>
            setTimeout(resolve, 50 * attempt),
          );

          continue;
        }

        // Any other error — log and rethrow immediately, no retry
        this.logger.error(
          `Failed to approve request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        throw error;
      }
    }

    // TypeScript requires a return here; the loop always returns or throws
    throw new BadRequestException(
      `Failed to approve request ${requestId} after ${OPTIMISTIC_LOCK_MAX_RETRIES} attempts.`,
    );
  }

  /**
   * Reject a pending time-off request.
   * @param requestId - Request ID
   * @param reason - Reason for rejection
   * @returns Updated request entity
   * @throws NotFoundException if request not found
   * @throws InvalidStateTransitionException if not in PENDING status
   */
  async rejectRequest(requestId: string, reason: string): Promise<Request> {
    this.logger.debug(`Rejecting request: ${requestId}`);

    try {
      const request = await this.getRequest(requestId);

      // Validate state transition
      if (request.status !== 'PENDING') {
        throw new InvalidStateTransitionException(
          `Invalid transition for ${requestId}: ${request.status} -> REJECTED`,
        );
      }

      // Update request
      request.status = 'REJECTED';
      request.rejection_reason = reason;
      request.hcm_sync_status = 'SYNCED';

      // Save updated request
      const updated = await this.requestsRepository.save(request);

      // Log audit event
      await this.auditService.logChange({
        entityType: 'REQUEST',
        entityId: updated.id,
        action: 'UPDATE',
        oldValue: { status: 'PENDING' },
        newValue: { status: 'REJECTED' },
        reason: reason,
      });

      this.logger.debug(`Request rejected: ${updated.id}`);

      return updated;
    } catch (error) {
      this.logger.error(
        `Failed to reject request: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Cancel an approved time-off request.
   * Only approved requests can be cancelled.
   * Refunds the requested days back to balance.
   * @param requestId - Request ID
   * @param reason - Reason for cancellation (optional)
   * @returns Updated request entity
   * @throws NotFoundException if request not found
   * @throws InvalidStateTransitionException if not in APPROVED status
   */
  async cancelRequest(requestId: string, reason?: string): Promise<Request> {
    this.logger.debug(`Cancelling request: ${requestId}`);

    try {
      const request = await this.getRequest(requestId);

      // Validate state transition - only APPROVED can be cancelled
      if (request.status !== 'APPROVED') {
        throw new InvalidStateTransitionException(
          `Invalid transition for ${requestId}: ${request.status} -> CANCELLED`,
        );
      }

      // Refund balance
      const daysToRefund = parseFloat(request.days_requested);
      await this.balancesService.refundBalance(
        request.employee_id,
        request.location_id,
        request.leave_type,
        daysToRefund,
      );

      // Update request
      request.status = 'CANCELLED';
      request.rejection_reason = reason || 'Request cancelled';
      request.hcm_sync_status = 'SYNCED';

      // Save updated request
      const updated = await this.requestsRepository.save(request);

      // Log audit event
      await this.auditService.logChange({
        entityType: 'REQUEST',
        entityId: updated.id,
        action: 'UPDATE',
        oldValue: { status: 'APPROVED' },
        newValue: { status: 'CANCELLED' },
        reason: reason || 'Request cancelled',
      });

      this.logger.debug(`Request cancelled: ${updated.id}`);

      return updated;
    } catch (error) {
      this.logger.error(
        `Failed to cancel request: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Get all requests for a specific employee.
   * @param employeeId - Employee ID
   * @param filters - Optional filters (status, dateRange, location)
   * @returns Array of requests sorted by submitted_at descending
   */
  async getRequestsByEmployee(
    employeeId: string,
    filters?: {
      status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
      startDate?: Date;
      endDate?: Date;
      locationId?: string;
    },
  ): Promise<Request[]> {
    this.logger.debug(`Retrieving requests for employee: ${employeeId}`);

    try {
      let query = this.requestsRepository.createQueryBuilder('r');

      // Base filter
      query = query.where('r.employee_id = :employeeId', { employeeId });

      // Optional filters
      if (filters?.status) {
        query = query.andWhere('r.status = :status', {
          status: filters.status,
        });
      }

      if (filters?.locationId) {
        query = query.andWhere('r.location_id = :locationId', {
          locationId: filters.locationId,
        });
      }

      if (filters?.startDate && filters?.endDate) {
        query = query.andWhere('r.created_at BETWEEN :startDate AND :endDate', {
          startDate: filters.startDate,
          endDate: filters.endDate,
        });
      }

      // Order by submitted_at descending
      query = query.orderBy('r.submitted_at', 'DESC');

      const requests = await query.getMany();

      this.logger.debug(
        `Retrieved ${requests.length} requests for employee ${employeeId}`,
      );

      return requests;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve requests: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}