import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { EnrollmentStatus } from '../../../common/enums/enrollment-status.enum';

export class CreateEnrollmentDto {
  @IsUUID('4', { message: 'ID lớp học không hợp lệ' })
  @IsNotEmpty({ message: 'ID lớp học không được để trống' })
  classId: string;

  @IsUUID('4', { message: 'ID học viên không hợp lệ' })
  @IsNotEmpty({ message: 'ID học viên không được để trống' })
  studentId: string;

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
