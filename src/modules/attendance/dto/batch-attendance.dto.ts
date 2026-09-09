import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class AttendanceRecordDto {
  @IsUUID('4', { message: 'ID học viên không hợp lệ' })
  studentId: string;

  @IsBoolean()
  isPresent: boolean;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Điểm số phải là số' })
  @Min(0, { message: 'Điểm số tối thiểu là 0' })
  @Max(10, { message: 'Điểm số tối đa là 10' })
  score?: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class BatchAttendanceDto {
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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records: AttendanceRecordDto[];
}
