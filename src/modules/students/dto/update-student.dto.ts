import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { Gender } from '../../../common/enums/gender.enum';
import { StudentStatus } from '../../../common/enums/student-status.enum';

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email phụ huynh không đúng định dạng' })
  parentEmail?: string;

  @IsOptional()
  @IsEnum(Gender, { message: 'Giới tính không hợp lệ' })
  gender?: Gender;

  @IsOptional()
  @IsEnum(StudentStatus, { message: 'Trạng thái học viên không hợp lệ' })
  status?: StudentStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
