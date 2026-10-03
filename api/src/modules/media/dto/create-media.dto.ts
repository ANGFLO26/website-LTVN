import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

// Only media data accepted at POST /media; IDs and timestamps belong to the database.
export class CreateMediaDto {
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @IsString()
  storageKey!: string;

  @IsString()
  publicUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string | null;

  @IsString()
  @MaxLength(100)
  mimeType!: string;

  @IsInt()
  sizeBytes!: number;

  @IsOptional()
  @IsInt()
  width?: number | null;

  @IsOptional()
  @IsInt()
  height?: number | null;
}
