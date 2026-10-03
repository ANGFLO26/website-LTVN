import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsString, Length, Matches, MaxLength } from 'class-validator';

// Stable public request codes mapped to the existing subject column, without a schema change.
export const CONTACT_REQUEST_TYPES = {
  quotation: 'Yêu cầu báo giá',
  product_consultation: 'Tư vấn lựa chọn sản phẩm',
  technical_support: 'Hỗ trợ kỹ thuật',
  maintenance_repair: 'Bảo trì hoặc sửa chữa',
  partnership: 'Hợp tác',
  other: 'Liên hệ khác',
} as const;

const trimString = ({ value }: { value: unknown }): unknown => (
  typeof value === 'string' ? value.trim() : value
);

export class PublicContactDto {
  @ApiProperty({ maxLength: 255 })
  @Transform(trimString)
  @IsString()
  @Length(1, 255)
  fullName: string;

  @ApiProperty({ minLength: 1, maxLength: 255 })
  @Transform(trimString)
  @IsString()
  @Length(1, 255)
  companyName: string;

  // Required by the existing NOT NULL column; never synthesize an email for a phone-only request.
  @ApiProperty({ format: 'email', maxLength: 255 })
  @Transform(trimString)
  @IsString()
  @MaxLength(255)
  @IsEmail()
  email: string;

  @ApiProperty({ maxLength: 50, description: '7–15 digits; optional leading +, spaces, parentheses, dots or hyphens' })
  @Transform(trimString)
  @IsString()
  @MaxLength(50)
  @Matches(/^\+?[0-9 ().-]+$/, { message: 'phone must contain a phone number, not letters or other characters' })
  @Matches(/^(?:\D*\d){7,15}\D*$/, { message: 'phone must contain between 7 and 15 digits' })
  phone: string;

  @ApiProperty({ enum: Object.keys(CONTACT_REQUEST_TYPES), description: 'Required request type; the server maps this code to the stored subject' })
  @Transform(trimString)
  @IsString()
  @IsIn(Object.keys(CONTACT_REQUEST_TYPES))
  requestType: keyof typeof CONTACT_REQUEST_TYPES;

  @ApiProperty({ minLength: 1, maxLength: 5000 })
  @Transform(trimString)
  @IsString()
  @Length(1, 5000)
  message: string;
}
