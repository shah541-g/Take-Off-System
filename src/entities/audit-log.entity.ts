import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Check,
} from 'typeorm';

/**
 * AuditLog Entity
 * Append-only immutable audit trail for all significant state changes
 * Tracks who changed what, when, and why
 */
@Entity('audit_logs')
@Index('idx_audit_logs_entity', ['entity_type', 'entity_id'])
@Index('idx_audit_logs_created', ['created_at'])
@Check(`"entity_type" IN ('REQUEST', 'BALANCE', 'SYNC')`)
@Check(
  `"action" IN ('CREATE', 'UPDATE', 'DELETE', 'SYNC', 'CONFLICT_DETECTED')`,
)
export class AuditLog {
  /**
   * Unique identifier (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Type of entity being audited
   * Values: REQUEST, BALANCE, SYNC
   */
  @Column({ type: 'varchar', length: 50 })
  entity_type!: 'REQUEST' | 'BALANCE' | 'SYNC';

  /**
   * ID of the entity being audited
   */
  @Column({ type: 'varchar', length: 100 })
  entity_id!: string;

  /**
   * Action performed on the entity
   * Values: CREATE, UPDATE, DELETE, SYNC, CONFLICT_DETECTED
   */
  @Column({ type: 'varchar', length: 50 })
  action!: 'CREATE' | 'UPDATE' | 'DELETE' | 'SYNC' | 'CONFLICT_DETECTED';

  /**
   * Previous state of the entity (JSON)
   * Null for CREATE actions
   */
  @Column({ type: 'text', nullable: true }) // SQLite uses TEXT for JSON
  old_value!: string | null;

  /**
   * New state of the entity (JSON)
   * Null for DELETE actions
   */
  @Column({ type: 'text', nullable: true }) // SQLite uses TEXT for JSON
  new_value!: string | null;

  /**
   * Reason for the change (e.g., business context)
   */
  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  /**
   * User ID who performed the action
   * Could be employee, admin, system, or service account
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  performed_by!: string | null;

  /**
   * IP address from which the action was performed
   * IPv4 or IPv6 format
   */
  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address!: string | null;

  /**
   * Timestamp when the audit log entry was created (immutable)
   */
  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;
}
