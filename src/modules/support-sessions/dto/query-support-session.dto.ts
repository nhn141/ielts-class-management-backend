import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { SupportSessionStatus } from '../../../common/enums/support-session-status.enum';

export class QuerySupportSessionDto {
  @IsOptional()
  @IsUUID('4')
  classId?: string;

  @IsOptional()
  @IsUUID('4')
  studentId?: string;

  @IsOptional()
  @IsUUID('4')
  teachingAssistantId?: string;

  @IsOptional()
  @IsUUID('4')
  teacherId?: string;

  @IsOptional()
  @IsEnum(SupportSessionStatus)
  status?: SupportSessionStatus;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
