import { Injectable, Logger } from '@nestjs/common';
import { BalanceHistory } from '../../entities/balance-history.entity';
import { Balance } from '../../entities/balance.entity';
import { BalanceHistoryRepository } from '../../repositories/balance-history.repository';
import { AuditService } from '../audit/audit.service';
import { AuditLogDto } from '../../dto/audit-log.dto';
import { DriftInfoDto } from '../../dto/sync.dto';

/**
 * DriftDetectionService
 * Detects and records unexplained balance changes from HCM
 * Classifies drift as INCREASE or DECREASE
 * Triggers alerts for significant changes
 */
@Injectable()
export class DriftDetectionService {
  private readonly logger = new Logger(DriftDetectionService.name);

  // Threshold for alerting on drift (in days)
  private readonly SIGNIFICANT_DRIFT_THRESHOLD = 1;

  constructor(
    private readonly balanceHistoryRepository: BalanceHistoryRepository,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Detect drift between local and HCM balance
   * Compares available balance and identifies the type and amount of change
   * @param localBalance - Local cached balance
   * @param hcmBalance - Fresh balance from HCM
   * @returns Drift info object with hasDrift flag and details
   */
  async detectDrift(
    localBalance: Balance,
    hcmBalance: any,
  ): Promise<{ hasDrift: boolean; drift?: DriftInfoDto }> {
    this.logger.debug(
      `Detecting drift for ${localBalance.employee_id}/${localBalance.leave_type}`,
    );

    // Convert string balance to number
    const localAvailable = parseFloat(localBalance.available_balance.toString());
    const hcmAvailable = parseFloat(hcmBalance.available);

    // Check if balances match
    if (Math.abs(localAvailable - hcmAvailable) < 0.01) {
      this.logger.debug(
        `No drift detected for ${localBalance.employee_id}/${localBalance.leave_type}`,
      );
      return { hasDrift: false };
    }

    // Calculate drift amount
    const driftAmount = hcmAvailable - localAvailable;
    const driftType = driftAmount > 0 ? 'INCREASE' : 'DECREASE';

    this.logger.warn(
      `Drift detected for ${localBalance.employee_id}/${localBalance.leave_type}: ` +
        `${driftType} of ${Math.abs(driftAmount)} days (local: ${localAvailable}, HCM: ${hcmAvailable})`,
    );

    const drift: DriftInfoDto = {
      employeeId: localBalance.employee_id,
      locationId: localBalance.location_id,
      leaveType: localBalance.leave_type,
      type: driftType,
      amount: Math.abs(driftAmount),
      localBalance: localAvailable,
      hcmBalance: hcmAvailable,
      reason: this.inferDriftReason(driftType, Math.abs(driftAmount)),
    };

    return { hasDrift: true, drift };
  }

  /**
   * Classify drift type based on amount
   * Positive amount = INCREASE, Negative = DECREASE
   * @param amount - Change amount in days
   * @returns Drift type classification
   */
  async classifyDrift(amount: number): Promise<'INCREASE' | 'DECREASE'> {
    this.logger.debug(`Classifying drift amount: ${amount}`);
    return amount > 0 ? 'INCREASE' : 'DECREASE';
  }

  /**
   * Determine if drift is significant and should trigger an alert
   * Significant = >= 1 day of change
   * @param drift - Drift information
   * @returns True if drift is significant
   */
  async shouldAlert(drift: DriftInfoDto): Promise<boolean> {
    const isSignificant = drift.amount >= this.SIGNIFICANT_DRIFT_THRESHOLD;

    this.logger.debug(
      `Drift alert check for ${drift.employeeId}: ` +
        `amount=${drift.amount}, significant=${isSignificant}`,
    );

    return isSignificant;
  }

  /**
   * Record drift event in balance history and audit trail
   * Creates BalanceHistory entry and audit log for drift detection
   * @param employeeId - Employee ID
   * @param locationId - Location ID
   * @param leaveType - Leave type
   * @param drift - Drift information
   * @returns Created balance history record
   */
  async recordDrift(
    employeeId: string,
    locationId: string,
    leaveType: string,
    drift: DriftInfoDto,
  ): Promise<BalanceHistory> {
this.logger.log(
      `Recording drift for ${employeeId}/${leaveType}: ` +
        `${drift.type} of ${drift.amount} days`,
    );

    try {
      // Create balance history entry
      const history = new BalanceHistory();
      history.employee_id = employeeId;
      history.location_id = locationId;
      history.leave_type = leaveType;
      history.previous_balance = drift.localBalance.toString();
      history.new_balance = drift.hcmBalance.toString();
      history.change_source = 'HCM_SYNC';
      history.detected_at = new Date();
      history.is_drift = true;

      // Save to repository
      const saved = await this.balanceHistoryRepository.save(history);

      // Audit log for drift detection
      const auditDto: AuditLogDto = {
        entityType: 'BALANCE',
        entityId: `${employeeId}/${locationId}/${leaveType}`,
        action: 'UPDATE',
        newValue: {
          driftDetected: true,
          driftType: drift.type,
          amount: drift.amount,
          localBalance: drift.localBalance,
          hcmBalance: drift.hcmBalance,
        },
        reason: `Unexplained balance change: ${drift.reason}`,
      };

      await this.auditService.logChange(auditDto);

      this.logger.log(
        `Drift recorded successfully for ${employeeId}/${leaveType}`,
      );

      return saved;
    } catch (error) {
      this.logger.error(
        `Failed to record drift: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Infer probable reason for drift based on type and amount
   * INCREASE: Usually work anniversary bonus or manual adjustment
   * DECREASE: Usually time used outside ReadyOn system
   * @param driftType - Type of drift (INCREASE or DECREASE)
   * @param amount - Drift amount in days
   * @returns Inferred reason description
   */
  private inferDriftReason(driftType: string, amount: number): string {
    if (driftType === 'INCREASE') {
      if (amount === 5) {
        return 'Possible work anniversary bonus';
      }
      return 'Manual balance adjustment in HCM';
    } else {
      return 'Time used outside ReadyOn system';
    }
  }
}
