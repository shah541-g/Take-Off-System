/**
 * BalanceDto
 * Data transfer object representing a time-off balance
 */
export class BalanceDto {
  /**
   * Employee ID from HCM system
   */
  employeeId!: string;

  /**
   * Location ID where employee is based
   */
  locationId!: string;

  /**
   * Type of leave (e.g., ANNUAL, SICK, UNPAID)
   */
  leaveType!: string;

  /**
   * Available balance (days)
   */
  availableBalance!: number;

  /**
   * Used/consumed balance (days)
   */
  usedBalance!: number;

  /**
   * Calendar year for the balance
   */
  year!: number;

  /**
   * Whether the cached balance is stale and needs refresh
   */
  isCacheStale!: boolean;

  /**
   * Timestamp when the balance was last synchronized from HCM
   */
  lastSyncedAt!: Date;
}
