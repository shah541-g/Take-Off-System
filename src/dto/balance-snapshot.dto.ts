/**
 * BalanceSnapshotDto
 * Represents a snapshot of balance at a point in time
 * Stored as JSON in the request record
 */
export class BalanceSnapshotDto {
  /**
   * Available balance at time of request
   */
  availableBalance!: string;

  /**
   * Used/consumed balance at time of request
   */
  usedBalance!: string;

  /**
   * Carryover balance from previous year
   */
  carryoverBalance?: string | null;

  /**
   * Timestamp when snapshot was taken
   */
  snapshotAt!: Date;

  /**
   * Balance version (for optimistic locking)
   */
  version?: number;
}
