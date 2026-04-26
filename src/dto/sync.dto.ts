/**
 * Employee dimension for batch sync
 */
export class EmployeeDimensionDto {
  employeeId!: string;
  locationId!: string;
  leaveType!: string;
}

/**
 * Batch sync request DTO
 * Request to synchronize balances for multiple employees
 */
export class BatchSyncDto {
  employees!: EmployeeDimensionDto[];
}

/**
 * Drift information
 * Represents an unexplained balance change detected from HCM
 */
export class DriftInfoDto {
  employeeId!: string;
  locationId!: string;
  leaveType!: string;
  type!: 'INCREASE' | 'DECREASE';
  amount!: number;
  localBalance!: number;
  hcmBalance!: number;
  reason?: string;
}

/**
 * Sync result DTO
 * Results of batch synchronization operation
 */
export class SyncResultDto {
  synced!: number;
  drifted!: number;
  failed!: number;
  driftDetails!: DriftInfoDto[];
  syncId?: string;
}

/**
 * Sync progress for tracking ongoing operations
 */
export class SyncProgressDto {
  synced!: number;
  total!: number;
}

/**
 * Sync status DTO
 * Current status of a synchronization operation
 */
export class SyncStatusDto {
  syncId!: string;
  status!: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  progress!: SyncProgressDto;
  startedAt!: Date;
  completedAt?: Date;
  failureReason?: string;
}

/**
 * Real-time sync result
 * Result of real-time balance synchronization before approval
 */
export class RealTimeSyncResultDto {
  availableBalance!: number;
  usedBalance!: number;
  hasDrift!: boolean;
  drift?: DriftInfoDto;
}

/**
 * Conflict resolution result
 */
export class ConflictResolutionResultDto {
  resolved!: boolean;
  message?: string;
  newVersion?: number;
}
