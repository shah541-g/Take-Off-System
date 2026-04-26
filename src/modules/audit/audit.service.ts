import { Injectable, Logger } from '@nestjs/common';
import { AuditLog } from '../../entities/audit-log.entity';
import { AuditLogsRepository } from '../../repositories/audit-logs.repository';
import { AuditLogDto } from '../../dto/audit-log.dto';

/**
 * AuditService
 * Manages audit logging for all significant state changes
 * Append-only audit trail for compliance and debugging
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly auditLogsRepository: AuditLogsRepository) {}

  /**
   * Log a state change to the audit trail
   * Append-only operation - never updates existing logs
   * @param dto - Audit log details
   * @returns Created audit log entry
   */
  async logChange(dto: AuditLogDto): Promise<AuditLog> {
    this.logger.debug(
      `Logging ${dto.action} for ${dto.entityType} ${dto.entityId}`,
    );

    try {
      // Create audit log entry
      const auditLog = new AuditLog();
      auditLog.entity_type = dto.entityType;
      auditLog.entity_id = dto.entityId;
      auditLog.action = dto.action;

      // Store old and new values as JSON strings
      auditLog.old_value = dto.oldValue ? JSON.stringify(dto.oldValue) : null;
      auditLog.new_value = dto.newValue
        ? JSON.stringify(dto.newValue)
        : null;

      auditLog.reason = dto.reason || null;
      auditLog.performed_by = dto.performedBy || null;
      auditLog.ip_address = dto.ipAddress || null;

      // Save to repository
      const saved = await this.auditLogsRepository.log(auditLog);

      this.logger.debug(
        `Audit logged: ${dto.entityType} ${dto.entityId} - ${dto.action}`,
      );

      return saved;
    } catch (error) {
      this.logger.error(
        `Failed to log audit: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Get all audit log entries for a specific entity
   * @param entityType - Type of entity (REQUEST, BALANCE, SYNC)
   * @param entityId - ID of the entity
   * @returns Array of audit log entries, sorted by created_at descending
   */
  async getAuditLog(
    entityType: 'REQUEST' | 'BALANCE' | 'SYNC',
    entityId: string,
  ): Promise<AuditLog[]> {
    this.logger.debug(`Retrieving audit log for ${entityType} ${entityId}`);

    try {
      const logs = await this.auditLogsRepository.findByEntity(
        entityType,
        entityId,
      );

      this.logger.debug(`Retrieved ${logs.length} audit entries`);

      return logs;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve audit log: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Get audit log entries within a date range
   * Useful for compliance reports and data analysis
   * @param startDate - Start of date range (inclusive)
   * @param endDate - End of date range (inclusive)
   * @returns Array of audit log entries within the range
   */
  async getAuditLogsByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<AuditLog[]> {
    this.logger.debug(
      `Retrieving audit logs between ${startDate.toISOString()} and ${endDate.toISOString()}`,
    );

    try {
      const logs = await this.auditLogsRepository.findByDateRange(
        startDate,
        endDate,
      );

      this.logger.debug(`Retrieved ${logs.length} audit entries in range`);

      return logs;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve audit logs by date range: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Get count of audit logs for an entity
   * Useful for monitoring activity levels
   * @param entityType - Type of entity
   * @param entityId - ID of the entity
   * @returns Number of audit entries for the entity
   */
  async getAuditLogCount(
    entityType: 'REQUEST' | 'BALANCE' | 'SYNC',
    entityId: string,
  ): Promise<number> {
    const logs = await this.getAuditLog(entityType, entityId);
    return logs.length;
  }
}
