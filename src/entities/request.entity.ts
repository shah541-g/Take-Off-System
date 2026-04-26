import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
  Index,
  Check,
} from 'typeorm';

/**
 * TimeOffRequest Entity
 * Represents a time-off request submitted by an employee
 * Manages the full lifecycle of leave requests with HCM synchronization
 */
@Entity('requests')
@Index('idx_requests_employee_status', ['employee_id', 'status'])
@Index('idx_requests_created_at', ['created_at'])
@Check(`"start_date" <= "end_date"`)
@Check(`"days_requested" > 0`)
@Check(
  `"status" IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')`,
)
@Check(
  `"hcm_sync_status" IN ('SYNCED', 'PENDING', 'FAILED')`,
)
export class Request {
  /**
   * Unique identifier (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Employee ID from HCM system
   */
  @Column({ type: 'varchar', length: 50 })
  employee_id!: string;

  /**
   * Location ID where employee is based
   */
  @Column({ type: 'varchar', length: 50 })
  location_id!: string;

  /**
   * Type of leave (e.g., ANNUAL, SICK, UNPAID)
   */
  @Column({ type: 'varchar', length: 50 })
  leave_type!: string;

  /**
   * Start date of time-off (inclusive)
   */
  @Column({ type: 'date' })
  start_date!: string;

  /**
   * End date of time-off (inclusive)
   */
  @Column({ type: 'date' })
  end_date!: string;

  /**
   * Number of days requested (can be fractional)
   * Stored as DECIMAL(5,2)
   */
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  days_requested!: string;

  /**
   * Current status of the request
   * Values: PENDING, APPROVED, REJECTED, CANCELLED
   */
  @Column({
    type: 'varchar',
    length: 50,
    default: 'PENDING',
  })
  status!: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

  /**
   * Snapshot of balance at time of request submission
   * Stored as JSON: { available_balance, used_balance, carryover_balance }
   */
  @Column({ type: 'text' }) // SQLite uses TEXT for JSON
  balance_snapshot!: string; // JSON string

  /**
   * Timestamp when request was submitted
   */
  @Column({ type: 'datetime' })
  submitted_at!: Date;

  /**
   * Timestamp when request was approved (null if not approved)
   */
  @Column({ type: 'datetime', nullable: true })
  approved_at!: Date | null;

  /**
   * Reason for rejection (null if not rejected)
   */
  @Column({ type: 'text', nullable: true })
  rejection_reason!: string | null;

  /**
   * HCM synchronization status
   * Values: SYNCED, PENDING, FAILED
   */
  @Column({
    type: 'varchar',
    length: 50,
    default: 'PENDING',
  })
  hcm_sync_status!: 'SYNCED' | 'PENDING' | 'FAILED';

  /**
   * Request ID assigned by HCM system (null if not yet synced)
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  hcm_request_id!: string | null;

  /**
   * Optimistic lock version counter.
   * TypeORM increments this on every save() and includes it in the
   * WHERE clause: UPDATE ... WHERE id = ? AND version = ?
   * If another process already updated the row, the version will have
   * changed and TypeORM throws OptimisticLockVersionMismatchError.
   * This replaces pessimistic locking which SQLite does not support.
   *
   * default: 1 is required for SQLite's synchronize to backfill the column
   * on existing rows — SQLite cannot add a NOT NULL column without a default.
   */
  @VersionColumn({ default: 1 })
  version!: number;

  /**
   * Timestamp when record was created
   */
  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;

  /**
   * Timestamp when record was last updated
   */
  @UpdateDateColumn({ type: 'datetime' })
  updated_at!: Date;
}