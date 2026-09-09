import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class EvaluateSupportSessionDto {
  @IsNotEmpty({ message: 'Trạng thái điểm danh không được để trống' })
  @IsBoolean({ message: 'Điểm danh phải là kiểu boolean (true/false)' })
  isPresent: boolean;

  @IsOptional()
  @IsString({ message: 'Lý do vắng phải là chuỗi văn bản' })
  absenceReason?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Điểm số phải là số' })
  @Min(0, { message: 'Điểm số nhỏ nhất là 0' })
  @Max(10, { message: 'Điểm số lớn nhất là 10' })
  score?: number;

  @IsOptional()
  @IsString({ message: 'Nhận xét phải là chuỗi văn bản' })
  taComment?: string;
}
