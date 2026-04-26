import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

/**
 * ApproveRequestDto
 * Data transfer object for approving a time-off request
 */
export class ApproveRequestDto {
  /**
   * ID of the user approving the request (required)
   */
  @IsNotEmpty()
  @IsString()
  approverId!: string;

  /**
   * Optional comment from the approver
   */
  @IsOptional()
  @IsString()
  comment?: string;
}
