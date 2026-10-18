import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRedirectDto {
  @ApiProperty({
    description: 'Đường dẫn URL cũ (Internal path, bắt đầu bằng /)',
    example: '/san-pham-cu',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  sourcePath!: string;

  @ApiProperty({
    description: 'Đường dẫn URL mới (Internal path, bắt đầu bằng /)',
    example: '/pac/optidist-2',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  destinationPath!: string;

  @ApiPropertyOptional({
    description: 'Trạng thái kích hoạt (mặc định true)',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Ghi chú lý do chuyển hướng (tùy chọn)',
    example: 'Chuyển hướng sản phẩm model cũ sang model mới',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
