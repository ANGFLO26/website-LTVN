import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRedirectDto {
  @ApiPropertyOptional({
    description: 'Đường dẫn URL cũ (Internal path, bắt đầu bằng /)',
    example: '/san-pham-cu',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  sourcePath?: string;

  @ApiPropertyOptional({
    description: 'Đường dẫn URL mới (Internal path, bắt đầu bằng /)',
    example: '/pac/optidist-2',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  destinationPath?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái kích hoạt',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Ghi chú lý do chuyển hướng',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
