import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository, MoreThanOrEqual } from 'typeorm';
import { Request } from '../entities/request.entity';

/**
 * RequestsRepository
 * Data access layer for time-off requests.
 *
 * Locking strategy: SQLite does not support pessimistic locking
 * (SELECT ... FOR UPDATE). Concurrency safety is handled via optimistic
 * locking — the Request entity carries a @VersionColumn() that TypeORM
 * checks on every save(). If two processes race to update the same row,
 * the second one gets OptimisticLockVersionMismatchError and can retry.
 */
@Injectable()
export class RequestsRepository extends Repository<Request> {
  constructor(private dataSource: DataSource) {
    super(Request, dataSource.createEntityManager());
  }

  /**
   * Find all requests for an employee with a specific status
   * @param employeeId - Employee ID
   * @param status - Request status filter
   * @returns Array of requests matching criteria
   */
  async findByEmployeeAndStatus(
    employeeId: string,
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED',
  ): Promise<Request[]> {
    return this.find({
      where: {
        employee_id: employeeId,
        status: status,
      },
    });
  }

  /**
   * Find recently created/updated requests
   * @param limit - Number of records to return (default 50)
   * @param offsetDays - Number of days back to look (default 30)
   * @returns Array of recent requests
   */
  async findRecent(limit = 50, offsetDays = 30): Promise<Request[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - offsetDays);

    return this.find({
      where: {
        created_at: MoreThanOrEqual(startDate),
      },
      order: {
        created_at: 'DESC',
      },
      take: limit,
    });
  }

  /**
   * Find a request by ID for mutation.
   *
   * No pessimistic lock is used — SQLite does not support it.
   * Concurrency safety comes from the @VersionColumn() on the entity:
   * TypeORM's save() appends AND version = ? to the UPDATE, so if another
   * process modified the row between this read and the save, TypeORM throws
   * OptimisticLockVersionMismatchError instead of silently overwriting.
   *
   * @param requestId - Request ID
   * @returns Request entity if found, null otherwise
   */
  async findWithLock(requestId: string): Promise<Request | null> {
    return this.findOne({
      where: { id: requestId },
    });
  }

  /**
   * Execute a callback within a database transaction.
   * Useful when a single operation must atomically write to multiple entities.
   *
   * For single-row approve/reject flows the @VersionColumn() on Request is
   * sufficient on its own — no explicit transaction is required there.
   *
   * @param work - Async callback receiving a transactional EntityManager
   * @returns Result of the callback
   */
  async runInTransaction<T>(
    work: (entityManager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(work);
  }
}