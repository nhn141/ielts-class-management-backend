import { IsArray, IsDateString, IsEnum, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ClassLevel } from '../../../common/enums/class-level.enum';
import { ClassStatus } from '../../../common/enums/class-status.enum';
import { ScheduleItemDto } from './schedule-item.dto';

export class UpdateClassDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsEnum(ClassLevel, { message: 'Level không hợp lệ' })
  level?: ClassLevel;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsUUID('4', { message: 'ID giáo viên không đúng định dạng UUID' })
  teacherId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày bắt đầu không hợp lệ' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày kết thúc không hợp lệ' })
  endDate?: string;

  @IsOptional()
  @IsEnum(ClassStatus, { message: 'Trạng thái lớp không hợp lệ' })
  status?: ClassStatus;

  @IsOptional()
  @IsArray({ message: 'Thời khóa biểu phải là một mảng' })
  @ValidateNested({ each: true })
  @Type(() => ScheduleItemDto)
  schedules?: ScheduleItemDto[];
}
