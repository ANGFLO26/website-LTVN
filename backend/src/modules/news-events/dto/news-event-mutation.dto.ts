import type { ContentJsonb } from '../../../database/schema.js';

export interface NewsEventTranslationInput {
  title: string;
  slug?: string;
  shortDescription?: string | null;
  content?: ContentJsonb | null;
  location?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

// Mutation input is separate from database rows and read relations.
export interface CreateNewsEventDto {
  type: 'news' | 'event';
  // Legacy flat fields for backward compatibility
  title?: string;
  slug?: string;
  shortDescription?: string | null;
  content?: ContentJsonb | null;
  location?: string | null;

  thumbnailImageId?: string | null;
  status?: 'draft' | 'published' | 'archived';
  // ISO 8601 timestamps with a timezone, or null to clear. Omit to preserve.
  eventStartAt?: string | null;
  eventEndAt?: string | null;

  // Authored bilingual translation inputs
  translations?: {
    vi?: NewsEventTranslationInput;
    en?: NewsEventTranslationInput | null;
  };
}

export type UpdateNewsEventDto = Partial<CreateNewsEventDto>;

