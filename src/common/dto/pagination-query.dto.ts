import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  _start?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  _end?: number;

  @IsOptional()
  @IsString()
  _sort?: string;

  @IsOptional()
  @IsString()
  _order?: 'ASC' | 'DESC' | 'asc' | 'desc';

  @IsOptional()
  @IsString()
  q?: string;
}
