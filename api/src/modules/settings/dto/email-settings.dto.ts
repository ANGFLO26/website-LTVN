import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export interface EmailSettingsResponseDto {
  notificationRecipient: string;
  smtpFrom: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUsername: string;
  smtpPasswordConfigured: boolean;
  source: 'database' | 'environment' | 'mixed' | 'unconfigured';
}

export class UpdateEmailSettingsDto {
  @IsNotEmpty({ message: 'Email nhận thông báo không được để trống.' })
  @IsEmail({}, { message: 'Email nhận thông báo không đúng định dạng.' })
  notificationRecipient: string;

  @IsNotEmpty({ message: 'Email người gửi không được để trống.' })
  @IsString({ message: 'Email người gửi phải là chuỗi ký tự.' })
  smtpFrom: string;

  @IsNotEmpty({ message: 'SMTP Host không được để trống.' })
  @IsString({ message: 'SMTP Host phải là chuỗi ký tự.' })
  smtpHost: string;

  @IsNotEmpty({ message: 'SMTP Port không được để trống.' })
  @Type(() => Number)
  @IsInt({ message: 'SMTP Port phải là số nguyên từ 1 đến 65535.' })
  @Min(1, { message: 'SMTP Port tối thiểu là 1.' })
  @Max(65535, { message: 'SMTP Port tối đa là 65535.' })
  smtpPort: number;

  @IsBoolean({ message: 'SMTP Secure phải là giá trị boolean (true/false).' })
  smtpSecure: boolean;

  @IsOptional()
  @IsString({ message: 'SMTP Username phải là chuỗi ký tự.' })
  smtpUsername?: string;

  @IsOptional()
  @IsString({ message: 'SMTP Password phải là chuỗi ký tự.' })
  smtpPassword?: string;

  @IsOptional()
  @IsBoolean({ message: 'clearSmtpPassword phải là boolean.' })
  clearSmtpPassword?: boolean;
}
