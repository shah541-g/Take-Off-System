import { IsString, IsDateString, IsNumber, Min, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * CreateRequestDto
 * Data transfer object for creating a new time-off request
 */
export class CreateRequestDto {
  /**
   * Employee ID from HCM system
   */
  @IsNotEmpty()
  @IsString()
  employeeId!: string;

  /**
   * Location ID where employee is based
   */
  @IsNotEmpty()
  @IsString()
  locationId!: string;

  /**
   * Type of leave (e.g., ANNUAL, SICK, UNPAID)
   */
  @IsNotEmpty()
  @IsString()
  leaveType!: string;

  /**
   * Start date of time-off (YYYY-MM-DD format)
   */
  @IsNotEmpty()
  @IsDateString()
  startDate!: string;

  /**
   * End date of time-off (YYYY-MM-DD format)
   */
  @IsNotEmpty()
  @IsDateString()
  endDate!: string;

  /**
   * Number of days requested (can be fractional)
   */
  @IsNotEmpty()
  @IsNumber()
  @Min(0.5)
  daysRequested!: number;

  /**
   * Reason for the time-off request (optional)
   */
  @IsOptional()
  @IsString()
  reason?: string;
}
