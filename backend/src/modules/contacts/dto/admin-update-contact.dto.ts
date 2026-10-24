import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export const ADMIN_CONTACT_STATUSES = [
  'new',
  'processing',
  'resolved',
  'spam',
] as const;

export class AdminUpdateContactDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(ADMIN_CONTACT_STATUSES)
  status?: (typeof ADMIN_CONTACT_STATUSES)[number];

  @IsOptional()
  @IsUUID()
  assignedTo?: string | null;

  @IsOptional()
  @IsString()
  adminNote?: string | null;
}
