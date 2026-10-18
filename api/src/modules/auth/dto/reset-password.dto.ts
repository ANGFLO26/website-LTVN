import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Mã xác thực đặt lại mật khẩu nhận được qua email',
    example: 'd9b73484f7b...',
  })
  @IsNotEmpty({ message: 'Mã xác thực đặt lại mật khẩu không được để trống.' })
  @IsString({ message: 'Mã xác thực phải là chuỗi ký tự.' })
  token!: string;

  @ApiProperty({
    description: 'Mật khẩu mới (tối thiểu 12 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt)',
    example: 'NewSecurePassword#2026',
    format: 'password',
  })
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống.' })
  @IsString({ message: 'Mật khẩu mới phải là chuỗi ký tự.' })
  @MaxLength(72, { message: 'Mật khẩu mới không được vượt quá 72 ký tự.' })
  newPassword!: string;
}
