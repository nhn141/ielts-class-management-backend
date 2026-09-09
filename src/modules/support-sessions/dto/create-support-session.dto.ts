import {
  ArrayNotEmpty,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { SupportSkill } from '../../../common/enums/support-skill.enum';

export class CreateSupportSessionDto {
  @IsNotEmpty({ message: 'Lớp học không được để trống' })
  @IsUUID('4', { message: 'ID lớp học không hợp lệ' })
  classId: string;

  @IsNotEmpty({ message: 'Học viên không được để trống' })
  @IsUUID('4', { message: 'ID học viên không hợp lệ' })
  studentId: string;

  @IsNotEmpty({ message: 'Trợ giảng không được để trống' })
  @IsUUID('4', { message: 'ID trợ giảng không hợp lệ' })
  teachingAssistantId: string;

  @IsNotEmpty({ message: 'Ngày diễn ra ca support không được để trống' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày học phải theo định dạng YYYY-MM-DD',
  })
  sessionDate: string;

  @IsNotEmpty({ message: 'Giờ bắt đầu không được để trống' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Giờ bắt đầu phải theo định dạng HH:mm (ví dụ: 14:30)',
  })
  startTime: string;

  @IsNotEmpty({ message: 'Giờ kết thúc không được để trống' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Giờ kết thúc phải theo định dạng HH:mm (ví dụ: 15:30)',
  })
  endTime: string;

  @ArrayNotEmpty({ message: 'Vui lòng chọn ít nhất 1 nội dung kĩ năng cần support' })
  @IsEnum(SupportSkill, {
    each: true,
    message: 'Nội dung kĩ năng không hợp lệ (chỉ chấp nhận: speaking, listening, writing, reading, vocabulary)',
  })
  skills: SupportSkill[];

  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi văn bản' })
  teacherNote?: string;
}
