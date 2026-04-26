import { IsString, IsNotEmpty } from 'class-validator';

/**
 * CancelRequestDto
 * Data transfer object for canceling a time-off request
 */
export class CancelRequestDto {
  /**
   * Reason for canceling the request (required)
   */
  @IsNotEmpty()
  @IsString()
  reason!: string;
}
