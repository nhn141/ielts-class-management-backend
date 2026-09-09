import { IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class EnsureSessionDto {
  @IsUUID('4', { message: 'ID lớp học không hợp lệ' })
  @IsNotEmpty({ message: 'Vui lòng chọn lớp học' })
  classId: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn ngày học' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Định dạng ngày phải là YYYY-MM-DD' })
  sessionDate: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsString()
  homework?: string;

  @IsOptional()
  @IsString()
  lessonNotes?: string;

  @IsOptional()
  @IsString()
  materialsUrl?: string;
}
