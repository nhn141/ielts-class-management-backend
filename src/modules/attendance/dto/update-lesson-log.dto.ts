import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateLessonLogDto {
  @IsOptional()
  @IsString({ message: 'Chủ đề bài học phải là chuỗi ký tự' })
  topic?: string;

  @IsOptional()
  @IsString({ message: 'Bài tập về nhà phải là chuỗi ký tự' })
  homework?: string;

  @IsOptional()
  @IsString({ message: 'Ghi chú bài học phải là chuỗi ký tự' })
  lessonNotes?: string;

  @IsOptional()
  @IsString({ message: 'Đường dẫn tài liệu phải là chuỗi ký tự' })
  materialsUrl?: string;
}
