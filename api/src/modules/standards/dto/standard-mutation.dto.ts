import { PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStandardDto {
  @IsString()
  @MaxLength(150)
  code!: string;

  @IsString()
  @MaxLength(50)
  organization!: string;

  @IsOptional()
  @IsInt()
  year?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;
}

// Omitted fields remain unchanged; only the schema's nullable fields accept null.
export class UpdateStandardDto extends PartialType(CreateStandardDto, {
  skipNullProperties: false,
}) {}
