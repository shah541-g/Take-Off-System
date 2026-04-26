import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Balance } from '../../entities/balance.entity';
import { BalancesService } from '../balances/balances.service';
import { HCMClient } from '../hcm-integration/hcm-client';
import { DriftDetectionService } from './drift-detection.service';
import { ConflictResolutionService } from './conflict-resolution.service';
import { AuditService } from '../audit/audit.service';
import { AuditLogDto } from '../../dto/audit-log.dto';
import {
  BatchSyncDto,
  EmployeeDimensionDto,
  SyncResultDto,
  SyncStatusDto,
  DriftInfoDto,
  SyncProgressDto,
  RealTimeSyncResultDto,
} from '../../dto/sync.dto';

interface SyncSession {
  syncId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  progress: SyncProgressDto;
  startedAt: Date;
  completedAt?: Date;
  failureReason?: string;
}

/**
 * SyncService
 * Orchestrates synchronization of balances with HCM
 * Manages batch sync, real-time sync, and drift detection
 * Critical for maintaining balance consistency
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private syncSessions: Map<string, SyncSession> = new Map();

  constructor(
    private readonly balancesService: BalancesService,
    private readonly hcmClient: HCMClient,
    private readonly driftDetectionService: DriftDetectionService,
    private readonly conflictResolutionService: ConflictResolutionService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Batch synchronize balances for multiple employees
   * Fetches all balances in one HCM batch call for efficiency
   * Detects drift for each employee
   * Updates local cache
   * Can be scheduled for periodic reconciliation (e.g., every 6 hours)
   * @param batchSyncDto - Batch sync request with employee dimensions
   * @returns Sync result with counts and drift details
   */
  async batchSyncBalances(batchSyncDto: BatchSyncDto): Promise<SyncResultDto> {
    const syncId = randomUUID();
    const startTime = Date.now();

    this.logger.log(
      `Starting batch sync (${syncId}) for ${batchSyncDto.employees.length} employees`,
    );

    // Initialize sync session
    const session: SyncSession = {
      syncId,
      status: 'IN_PROGRESS',
      progress: { synced: 0, total: batchSyncDto.employees.length },
      startedAt: new Date(),
    };
    this.syncSessions.set(syncId, session);

    const result: SyncResultDto = {
      synced: 0,
      drifted: 0,
      failed: 0,
      driftDetails: [],
      syncId,
    };

    try {
      // Process each employee
      for (const employee of batchSyncDto.employees) {
        try {
          // Call HCM batch endpoint for this employee
          const hcmBalance = await this.hcmClient.getBalance(
            employee.employeeId,
            employee.locationId,
            employee.leaveType,
          );

          // Get local balance
          const localBalance = await this.balancesService.getBalance(
            employee.employeeId,
            employee.locationId,
            employee.leaveType,
            new Date().getFullYear(),
          );

          // Detect drift
          const driftCheck = await this.driftDetectionService.detectDrift(
            localBalance,
            hcmBalance,
          );

          if (driftCheck.hasDrift && driftCheck.drift) {
            // Record drift
            await this.driftDetectionService.recordDrift(
              employee.employeeId,
              employee.locationId,
              employee.leaveType,
              driftCheck.drift,
            );

            result.drifted++;
            result.driftDetails.push(driftCheck.drift);

            // Check if significant
            if (await this.driftDetectionService.shouldAlert(driftCheck.drift)) {
              this.logger.warn(
                `Significant drift for ${employee.employeeId}: ${driftCheck.drift.type} ${driftCheck.drift.amount} days`,
              );
            }
          }

          // Reconcile balance
          await this.conflictResolutionService.reconcileBalance(
            employee.employeeId,
            employee.locationId,
            employee.leaveType,
            hcmBalance,
          );

          result.synced++;
        } catch (error) {
          this.logger.error(
            `Failed to sync ${employee.employeeId}/${employee.leaveType}: ` +
              `${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          result.failed++;
        }

        // Update progress
        session.progress.synced++;
      }

      // Mark session as completed
      session.status = 'COMPLETED';
      session.completedAt = new Date();

      // Record sync event
      await this.recordSyncEvent({
        syncId,
        action: 'BATCH_SYNC_COMPLETED',
        result,
        durationMs: Date.now() - startTime,
      });

      this.logger.log(
        `Batch sync completed (${syncId}): ` +
          `synced=${result.synced}, drifted=${result.drifted}, failed=${result.failed} ` +
          `(${Date.now() - startTime}ms)`,
      );

      return result;
    } catch (error) {
      session.status = 'FAILED';
      session.completedAt = new Date();
      session.failureReason = error instanceof Error ? error.message : 'Unknown error';

      // Record sync event
      await this.recordSyncEvent({
        syncId,
        action: 'BATCH_SYNC_FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime,
      });

      this.logger.error(
        `Batch sync failed (${syncId}): ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      throw error;
    }
  }

  /**
   * Real-time balance synchronization
   * CRITICAL: Called before approval to ensure accurate balance
   * Fetches fresh balance from HCM
   * Compares with cache
   * Detects any drift
   * Must complete before balance is locked for approval
   * @param employeeId - Employee ID
   * @param locationId - Location ID
   * @param leaveType - Leave type
   * @param year - Balance year
   * @returns Fresh balance from HCM with drift info
   * @throws Error if HCM fails after retries (critical path)
   */
  async realTimeSyncBalance(
    employeeId: string,
    locationId: string,
    leaveType: string,
    year: number,
  ): Promise<RealTimeSyncResultDto> {
    this.logger.debug(
      `Real-time sync for ${employeeId}/${leaveType} (critical path)`,
    );

    try {
      // Fetch fresh balance from HCM (with retries via HCMClient)
      const hcmBalance = await this.hcmClient.getBalance(
        employeeId,
        locationId,
        leaveType,
      );

      // Get local cached balance
      const localBalance = await this.balancesService.getBalance(
        employeeId,
        locationId,
        leaveType,
        year,
      );

      // Detect drift
      const driftCheck = await this.driftDetectionService.detectDrift(
        localBalance,
        hcmBalance,
      );

      // If drift detected, record it
      let drift: DriftInfoDto | undefined;
      if (driftCheck.hasDrift && driftCheck.drift) {
        drift = driftCheck.drift;

        // Record drift for investigation
        await this.driftDetectionService.recordDrift(
          employeeId,
          locationId,
          leaveType,
          drift,
        );

        // Log warning if significant
        if (await this.driftDetectionService.shouldAlert(drift)) {
          this.logger.warn(
            `Significant drift detected before approval: ${employeeId} - ` +
              `${drift.type} ${drift.amount} days`,
          );
        }
      }

      // Reconcile to ensure latest balance is available
      await this.conflictResolutionService.reconcileBalance(
        employeeId,
        locationId,
        leaveType,
        hcmBalance,
      );

      this.logger.debug(
        `Real-time sync completed for ${employeeId}/${leaveType}: ` +
          `available=${hcmBalance.available}, hasDrift=${driftCheck.hasDrift}`,
      );

      return {
        availableBalance: typeof hcmBalance.available === 'string' ? parseFloat(hcmBalance.available) : hcmBalance.available,
        usedBalance: typeof hcmBalance.used === 'string' ? parseFloat(hcmBalance.used) : hcmBalance.used,
        hasDrift: driftCheck.hasDrift,
        drift,
      };
    } catch (error) {
      this.logger.error(
        `Real-time sync failed for ${employeeId}/${leaveType}: ` +
          `${error instanceof Error ? error.message : 'Unknown error'} (CRITICAL)`,
      );
      throw error;
    }
  }

  /**
   * Detect drift for a specific employee
   * Compare local cached balance with HCM
   * If different: log drift, update balance, audit event
   * @param employeeId - Employee ID
   * @param locationId - Location ID
   * @param leaveType - Leave type
   * @param year - Balance year
   * @returns Drift detection result
   */
  async detectDrift(
    employeeId: string,
    locationId: string,
    leaveType: string,
    year: number,
  ): Promise<{ hasDrift: boolean; drift?: DriftInfoDto }> {
    this.logger.debug(
      `Detecting drift for ${employeeId}/${leaveType}`,
    );

    try {
      // Fetch from HCM
      const hcmBalance = await this.hcmClient.getBalance(
        employeeId,
        locationId,
        leaveType,
      );

      // Get local balance
      const localBalance = await this.balancesService.getBalance(
        employeeId,
        locationId,
        leaveType,
        year,
      );

      // Detect drift
      return await this.driftDetectionService.detectDrift(
        localBalance,
        hcmBalance,
      );
    } catch (error) {
      this.logger.error(
        `Failed to detect drift: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Get status of an ongoing or completed sync operation
   * @param syncId - Sync operation ID
   * @returns Current sync status
   * @throws Error if sync not found
   */
  async getSyncStatus(syncId: string): Promise<SyncStatusDto> {
    this.logger.debug(`Getting sync status for ${syncId}`);

    const session = this.syncSessions.get(syncId);
    if (!session) {
      throw new Error(`Sync session not found: ${syncId}`);
    }

    return {
      syncId: session.syncId,
      status: session.status,
      progress: session.progress,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      failureReason: session.failureReason,
    };
  }

  /**
   * Record sync event in audit trail
   * Internal method for logging all sync operations
   * @param event - Event details
   */
  private async recordSyncEvent(event: {
    syncId: string;
    action: string;
    result?: SyncResultDto;
    error?: string;
    durationMs: number;
  }): Promise<void> {
    try {
      const auditDto: AuditLogDto = {
        entityType: 'SYNC',
        entityId: event.syncId,
        action: 'SYNC' as const,
        newValue: {
          duration: event.durationMs,
          result: event.result,
          eventAction: event.action,
        },
        reason: event.error || 'Sync operation',
      };

      await this.auditService.logChange(auditDto);

      this.logger.debug(`Sync event recorded: ${event.action}`);
    } catch (error) {
      this.logger.error(
        `Failed to record sync event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Don't throw - audit is best-effort
    }
  }
}
