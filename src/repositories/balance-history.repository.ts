import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Between } from 'typeorm';
import { BalanceHistory } from '../entities/balance-history.entity';

/**
 * BalanceHistoryRepository
 * Data access layer for balance change history
 * Provides methods for querying historical balance changes and detecting drift
 */
@Injectable()
export class BalanceHistoryRepository extends Repository<BalanceHistory> {
  constructor(private dataSource: DataSource) {
    super(BalanceHistory, dataSource.createEntityManager());
  }

  /**
   * Find balance history records by employee, location, and leave type
   * @param employeeId - Employee ID
   * @param locationId - Location ID
   * @param leaveType - Type of leave
   * @returns Array of history records
   */
  async findByDimensions(
    employeeId: string,
    locationId: string,
    leaveType: string,
  ): Promise<BalanceHistory[]> {
    return this.find({
      where: {
        employee_id: employeeId,
        location_id: locationId,
        leave_type: leaveType,
      },
      order: {
        created_at: 'DESC',
      },
    });
  }

  /**
   * Find recent drift records that need investigation
   * @param limit - Number of records to return (default 100)
   * @returns Array of drift history records
   */
  async findRecentDrift(limit = 100): Promise<BalanceHistory[]> {
    return this.find({
      where: {
        is_drift: true,
      },
      order: {
        created_at: 'DESC',
      },
      take: limit,
    });
  }

  /**
   * Find balance history records within a date range
   * @param startDate - Start of date range
   * @param endDate - End of date range
   * @returns Array of history records within date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<BalanceHistory[]> {
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
