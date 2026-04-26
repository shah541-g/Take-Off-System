import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
  Check,
} from 'typeorm';

/**
 * Balance Entity
 * Caches balance information for employees by leave type and location
 * Acts as the source of truth for balance validation
 */
@Entity('balances')
@Index('idx_balances_composite', ['employee_id', 'location_id', 'leave_type'])
@Unique('uq_balance_dimensions', [
  'employee_id',
  'location_id',
  'leave_type',
  'balance_year',
])
@Check(`"available_balance" >= 0`)
@Check(`"used_balance" >= 0`)
export class Balance {
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
   * Available balance for the leave type
   * Stored as DECIMAL(5,2) for precision
   */
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  available_balance!: string;

  /**
   * Used/consumed balance
   * Stored as DECIMAL(5,2) for precision
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  used_balance!: string;

  /**
   * Carryover balance from previous year (if applicable)
   * Stored as DECIMAL(5,2) for precision
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  carryover_balance!: string | null;

  /**
   * Year for which this balance is valid (e.g., 2024)
   */
  @Column({ type: 'integer' })
  balance_year!: number;

  /**
   * Timestamp when this balance was last synced from HCM
   */
  @Column({ type: 'datetime' })
  hcm_last_updated_at!: Date;

  /**
   * Timestamp when this cache was last refreshed/validated
   */
  @Column({ type: 'datetime' })
  readyon_cached_at!: Date;

  /**
   * Flag indicating if balance cache may be stale
   * True if time since last HCM sync exceeds TTL (30 minutes)
   */
  @Column({ type: 'boolean', default: false })
  is_stale!: boolean;

  /**
   * Version number for optimistic locking
   * Incremented on each update to prevent lost updates
   */
  @Column({ type: 'integer', default: 1 })
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
