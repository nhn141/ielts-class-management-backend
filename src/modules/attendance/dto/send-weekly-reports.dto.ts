import { IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class SendWeeklyReportsDto {
  @IsOptional()
  @IsUUID('4', { message: 'ID lớp học không hợp lệ' })
  classId?: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn ngày bắt đầu tuần' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Định dạng ngày bắt đầu phải là YYYY-MM-DD' })
  startDate: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn ngày kết thúc tuần' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Định dạng ngày kết thúc phải là YYYY-MM-DD' })
  endDate: string;
}
