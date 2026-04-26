import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

/**
 * RejectRequestDto
 * Data transfer object for rejecting a time-off request
 */
export class RejectRequestDto {
  /**
   * Reason for rejecting the request (required)
   */
  @IsNotEmpty()
  @IsString()
  reason!: string;

  /**
   * ID of the approver rejecting the request (optional)
   */
  @IsOptional()
  @IsString()
  approverId?: string;
}
