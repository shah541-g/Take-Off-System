import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { Balance } from '../../entities/balance.entity';
import { BalancesRepository } from '../../repositories/balances.repository';
import { AuditService } from '../audit/audit.service';
import { AuditLogDto } from '../../dto/audit-log.dto';
import { ConflictResolutionResultDto, DriftInfoDto } from '../../dto/sync.dto';

/**
 * ConflictResolutionService
 * Handles balance conflicts and version mismatches
 * Uses optimistic locking to detect concurrent modifications
 * Reconciles balances when conflicts are detected
 */
@Injectable()
export class ConflictResolutionService {
  private readonly logger = new Logger(ConflictResolutionService.name);

  constructor(
    private readonly balancesRepository: BalancesRepository,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Reconcile local balance with HCM balance
   * Updates local balance to match HCM and increments version
   * Handles optimistic locking conflicts
   * @param employeeId - Employee ID
   * @param locationId - Location ID
   * @param leaveType - Leave type
   * @param hcmBalance - Fresh balance from HCM
   * @returns Updated balance entity
   * @throws ConflictException if version mismatch detected
   */
  async reconcileBalance(
    employeeId: string,
    locationId: string,
    leaveType: string,
    hcmBalance: any,
  ): Promise<Balance> {
    this.logger.debug(
      `Reconciling balance for ${employeeId}/${leaveType} from HCM: ${hcmBalance.available}`,
    );

    try {
      // Fetch current balance
      const balance = await this.balancesRepository.findOne({
        where: {
          employee_id: employeeId,
          location_id: locationId,
          leave_type: leaveType,
        },
      });

      if (!balance) {
        this.logger.error(
          `Balance not found for reconciliation: ${employeeId}/${leaveType}`,
        );
        throw new Error('Balance not found');
      }

      // Store old values for audit
      const oldAvailable = balance.available_balance;
      const oldVersion = balance.version || 1;

      // Update balance from HCM
      balance.available_balance = hcmBalance.available;
      balance.used_balance = hcmBalance.used;
      balance.version = (balance.version || 0) + 1;

      // Save with optimistic lock check
      const saved = await this.balancesRepository.save(balance);

      // Audit log for reconciliation
      const auditDto: AuditLogDto = {
        entityType: 'BALANCE',
        entityId: `${employeeId}/${locationId}/${leaveType}`,
        action: 'UPDATE',
        oldValue: {
          availableBalance: oldAvailable,
          version: oldVersion,
        },
        newValue: {
          availableBalance: hcmBalance.available,
          version: balance.version,
        },
        reason: 'HCM synchronization',
      };

      await this.auditService.logChange(auditDto);

      this.logger.log(
        `Balance reconciled for ${employeeId}/${leaveType}: ` +
          `v${oldVersion} -> v${balance.version}`,
      );

      return saved;
    } catch (error) {
      this.logger.error(
        `Failed to reconcile balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Handle version conflict when concurrent modification is detected
   * Logs conflict and increments conflict counter
   * Can retry or escalate based on retry count
   * @param employeeId - Employee ID
   * @param locationId - Location ID
   * @param leaveType - Leave type
   * @param expectedVersion - Expected version number
   * @throws ConflictException with details about conflict
   */
  async handleVersionConflict(
    employeeId: string,
    locationId: string,
    leaveType: string,
    expectedVersion: number,
  ): Promise<void> {
    this.logger.warn(
      `Version conflict detected for ${employeeId}/${leaveType}: ` +
        `expected v${expectedVersion}`,
    );

    // Fetch current balance to see actual version
    const balance = await this.balancesRepository.findOne({
      where: {
        employee_id: employeeId,
        location_id: locationId,
        leave_type: leaveType,
      },
    });

    if (!balance) {
      throw new ConflictException('Balance not found');
    }

    const actualVersion = balance.version || 1;

    // Audit log for conflict
    const auditDto: AuditLogDto = {
      entityType: 'BALANCE',
      entityId: `${employeeId}/${locationId}/${leaveType}`,
      action: 'CONFLICT_DETECTED',
      oldValue: {
        expectedVersion,
      },
      newValue: {
        actualVersion,
      },
      reason: 'Concurrent modification detected',
    };

    await this.auditService.logChange(auditDto);

    throw new ConflictException(
      `Version conflict for ${employeeId}/${leaveType}: ` +
        `expected v${expectedVersion} but found v${actualVersion}. ` +
        `Balance was modified by another process.`,
    );
  }

  /**
   * Record drift as a conflict/discrepancy event
   * Creates audit trail for drift detection
   * @param drift - Drift information to record
   * @returns Resolution result
   */
  async recordDriftEvent(drift: DriftInfoDto): Promise<ConflictResolutionResultDto> {
    this.logger.log(
      `Recording drift event for ${drift.employeeId}/${drift.leaveType}: ` +
        `${drift.type} of ${drift.amount} days`,
    );

    try {
      // Audit log for drift event
      const auditDto: AuditLogDto = {
        entityType: 'BALANCE',
        entityId: `${drift.employeeId}/${drift.locationId}/${drift.leaveType}`,
        action: 'UPDATE',
        newValue: {
          driftDetected: true,
          driftType: drift.type,
          amount: drift.amount,
          localBalance: drift.localBalance,
          hcmBalance: drift.hcmBalance,
          reason: drift.reason,
        },
        reason: `Drift detected during sync: ${drift.reason}`,
      };

      await this.auditService.logChange(auditDto);

      this.logger.log(
        `Drift event recorded for ${drift.employeeId}/${drift.leaveType}`,
      );

      return {
        resolved: true,
        message: `Drift recorded for ${drift.employeeId}: ${drift.type} of ${drift.amount} days`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to record drift event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      return {
        resolved: false,
        message: `Failed to record drift event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Detect if a version conflict exists
   * @param balance - Balance entity with current version
   * @param expectedVersion - Expected version
   * @returns True if versions don't match
   */
  hasVersionConflict(balance: Balance, expectedVersion: number): boolean {
    const currentVersion = balance.version || 1;
    const hasConflict = currentVersion !== expectedVersion;

    if (hasConflict) {
      this.logger.debug(
        `Version conflict detected: expected ${expectedVersion}, actual ${currentVersion}`,
      );
    }

    return hasConflict;
  }
}
