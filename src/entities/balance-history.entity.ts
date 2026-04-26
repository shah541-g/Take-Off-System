import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Check,
} from 'typeorm';

/**
 * BalanceHistory Entity
 * Append-only log of all balance changes
 * Used for drift detection and audit trail
 */
@Entity('balance_history')
@Index('idx_balance_history_employee', ['employee_id', 'created_at'])
@Check(
  `"change_source" IN ('HCM_SYNC', 'REQUEST_APPROVAL', 'REQUEST_REJECTION', 'ADMIN_ADJUSTMENT')`,
)
export class BalanceHistory {
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
   * Type of leave affected by this change
   */
  @Column({ type: 'varchar', length: 50 })
  leave_type!: string;

  /**
   * Balance before this change
   * Stored as DECIMAL(5,2)
   */
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  previous_balance!: string;

  /**
   * Balance after this change
   * Stored as DECIMAL(5,2)
   */
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  new_balance!: string;

  /**
   * Source of the balance change
   * Values: HCM_SYNC, REQUEST_APPROVAL, REQUEST_REJECTION, ADMIN_ADJUSTMENT
   */
  @Column({ type: 'varchar', length: 50 })
  change_source!:
    | 'HCM_SYNC'
    | 'REQUEST_APPROVAL'
    | 'REQUEST_REJECTION'
    | 'ADMIN_ADJUSTMENT';

  /**
   * Timestamp when the change was detected/recorded
   */
  @Column({ type: 'datetime' })
  detected_at!: Date;

  /**
   * Original timestamp from HCM (when change occurred in source system)
   */
  @Column({ type: 'datetime', nullable: true })
  hcm_source_timestamp!: Date | null;

  /**
   * Flag indicating if this change represents a drift
   * True if unexplained balance change detected from HCM
   */
  @Column({ type: 'boolean', default: false })
  is_drift!: boolean;

  /**
   * Timestamp when this history record was created (immutable)
   */
  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;
}
