import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Between } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

/**
 * AuditLogsRepository
 * Data access layer for audit log records
 * Provides methods for logging changes and querying audit trail
 */
@Injectable()
export class AuditLogsRepository extends Repository<AuditLog> {
  constructor(private dataSource: DataSource) {
    super(AuditLog, dataSource.createEntityManager());
  }

  /**
   * Create and save a new audit log entry
   * @param auditLog - AuditLog entity to save
   * @returns Saved audit log record
   */
  async log(auditLog: Partial<AuditLog>): Promise<AuditLog> {
    const entity = this.create(auditLog);
    return this.save(entity);
  }

  /**
   * Find all audit log entries for a specific entity
   * @param entityType - Type of entity (REQUEST, BALANCE, SYNC)
   * @param entityId - ID of the entity
   * @returns Array of audit log records for the entity
   */
  async findByEntity(
    entityType: 'REQUEST' | 'BALANCE' | 'SYNC',
    entityId: string,
  ): Promise<AuditLog[]> {
    return this.find({
      where: {
        entity_type: entityType,
        entity_id: entityId,
      },
      order: {
        created_at: 'DESC',
      },
    });
  }

  /**
   * Find audit log entries within a date range
   * @param startDate - Start of date range
   * @param endDate - End of date range
   * @returns Array of audit log records within date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<AuditLog[]> {
    return this.find({
      where: {
        created_at: Between(startDate, endDate),
      },
      order: {
        created_at: 'DESC',
      },
    });
  }
}
