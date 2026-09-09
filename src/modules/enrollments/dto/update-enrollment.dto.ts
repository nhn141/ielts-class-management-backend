import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { EnrollmentStatus } from '../../../common/enums/enrollment-status.enum';

export class UpdateEnrollmentDto {
  @IsOptional()
  @IsDateString({}, { message: 'Ngày ghi danh không hợp lệ' })
  enrolledAt?: string;

  @IsOptional()
  @IsEnum(EnrollmentStatus, { message: 'Trạng thái ghi danh không hợp lệ' })
  status?: EnrollmentStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
