import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ScheduleItemDto {
  @IsInt({ message: 'Thứ trong tuần phải là số nguyên' })
  @Min(2, { message: 'Thứ trong tuần từ 2 (Thứ 2) đến 8 (Chủ nhật)' })
  @Max(8, { message: 'Thứ trong tuần từ 2 (Thứ 2) đến 8 (Chủ nhật)' })
  @Type(() => Number)
  dayOfWeek: number;

  @IsString({ message: 'Giờ bắt đầu không được để trống' })
  @IsNotEmpty({ message: 'Giờ bắt đầu không được để trống' })
  startTime: string;

  @IsString({ message: 'Giờ kết thúc không được để trống' })
  @IsNotEmpty({ message: 'Giờ kết thúc không được để trống' })
  endTime: string;

  @IsOptional()
  @IsString()
  room?: string;
}
