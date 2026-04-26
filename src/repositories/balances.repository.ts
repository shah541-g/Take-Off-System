import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Balance } from '../entities/balance.entity';

/**
 * BalancesRepository
 * Data access layer for balance cache
 * Provides methods for querying and managing balance records
 */
@Injectable()
export class BalancesRepository extends Repository<Balance> {
  constructor(private dataSource: DataSource) {
    super(Balance, dataSource.createEntityManager());
  }

  /**
   * Find balance by employee, location, and leave type dimensions
   * @param employeeId - Employee ID
   * @param locationId - Location ID
   * @param leaveType - Type of leave
   * @returns Balance entity if found
   */
  async findByDimensions(
    employeeId: string,
    locationId: string,
    leaveType: string,
  ): Promise<Balance | null> {
    return this.createQueryBuilder('balance')
      .where('LOWER(balance.employee_id) = LOWER(:employeeId)', { employeeId })
      .andWhere('LOWER(balance.location_id) = LOWER(:locationId)', { locationId })
      .andWhere('LOWER(balance.leave_type) = LOWER(:leaveType)', { leaveType })
      .getOne();
  }

  /**
   * Find all stale balance records that need refresh
   * Stale records are those where is_stale flag is true
   * @returns Array of stale balance records
   */
  async findStale(): Promise<Balance[]> {
    return this.find({
      where: {
        is_stale: true,
      },
    });
  }

  /**
   * Find all balances for a specific employee across all leave types and locations
   * @param employeeId - Employee ID
   * @returns Array of balance records for the employee
   */
  async findByEmployee(employeeId: string): Promise<Balance[]> {
    return this.createQueryBuilder('balance')
      .where('LOWER(balance.employee_id) = LOWER(:employeeId)', { employeeId })
      .getMany();
  }
}
