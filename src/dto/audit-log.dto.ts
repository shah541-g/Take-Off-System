import { IsString, IsOptional } from 'class-validator';

/**
 * AuditLogDto
 * Data transfer object for audit log entries
 */
export class AuditLogDto {
  /**
   * Type of entity being audited (REQUEST, BALANCE, SYNC)
   */
  @IsString()
  entityType!: 'REQUEST' | 'BALANCE' | 'SYNC';

  /**
   * ID of the entity being audited
   */
  @IsString()
  entityId!: string;

  /**
   * Action performed on the entity
   */
  @IsString()
  action!: 'CREATE' | 'UPDATE' | 'DELETE' | 'SYNC' | 'CONFLICT_DETECTED';

  /**
   * Previous state of the entity (JSON)
   */
  @IsOptional()
  oldValue?: Record<string, any> | null;

  /**
   * New state of the entity (JSON)
   */
  @IsOptional()
  newValue?: Record<string, any> | null;

  /**
   * Reason for the change
   */
  @IsOptional()
  @IsString()
  reason?: string | null;

  /**
   * User ID who performed the action
   */
  @IsOptional()
  @IsString()
  performedBy?: string | null;

  /**
   * IP address from which the action was performed
   */
  @IsOptional()
  @IsString()
  ipAddress?: string | null;
}
