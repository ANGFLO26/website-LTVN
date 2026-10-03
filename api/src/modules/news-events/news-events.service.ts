import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { isISO8601 } from 'class-validator';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../../database/database.module.js';
import * as schema from '../../database/schema.js';

import { isValidUuid } from '../../common/uuid.util.js';
import type {
  CreateNewsEventDto,
  UpdateNewsEventDto,
  NewsEventTranslationInput,
} from './dto/news-event-mutation.dto.js';

@Injectable()
export class NewsEventsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  findAll(locale?: string) {
    const validLocale = this.validateLocale(locale);
    return this.queryAll(false, validLocale);
  }

  findPublished(locale?: string) {
    const validLocale = this.validateLocale(locale);
    return this.queryAll(true, validLocale);
  }

  private validateLocale(locale?: string): 'vi' | 'en' | undefined {
    if (locale === undefined || locale === null || locale === '') {
      return undefined;
    }
    const trimmed = String(locale).trim().toLowerCase();
    if (trimmed === 'vi' || trimmed === 'en') {
      return trimmed;
    }
    throw new BadRequestException(`Invalid locale "${locale}". Supported locales are "vi", "en"`);
  }

  private formatItem(item: any, locale?: 'vi' | 'en') {
    const rawTranslations: any[] = Array.isArray(item.translations) ? item.translations : [];
    const viTrans = rawTranslations.find((t) => t.locale === 'vi');
    const enTrans = rawTranslations.find((t) => t.locale === 'en');

    const translationsMap = {
      vi: viTrans
        ? {
            title: viTrans.title,
            slug: viTrans.slug,
            shortDescription: viTrans.shortDescription ?? null,
            content: viTrans.content ?? null,
            location: viTrans.location ?? null,
            seoTitle: viTrans.seoTitle ?? null,
            seoDescription: viTrans.seoDescription ?? null,
          }
        : item.title
          ? {
              title: item.title,
              slug: item.slug,
              shortDescription: item.shortDescription ?? null,
              content: item.content ?? null,
              location: item.location ?? null,
              seoTitle: null,
              seoDescription: null,
            }
          : null,
      en:
        enTrans && enTrans.title && String(enTrans.title).trim().length > 0
          ? {
              title: enTrans.title,
              slug: enTrans.slug,
              shortDescription: enTrans.shortDescription ?? null,
              content: enTrans.content ?? null,
              location: enTrans.location ?? null,
              seoTitle: enTrans.seoTitle ?? null,
              seoDescription: enTrans.seoDescription ?? null,
            }
          : null,
    };

    let title = item.title;
    let slug = item.slug;
    let shortDescription = item.shortDescription;
    let content = item.content;
    let location = item.location;

    if (locale === 'vi') {
      if (translationsMap.vi) {
        title = translationsMap.vi.title;
        slug = translationsMap.vi.slug;
        shortDescription = translationsMap.vi.shortDescription;
        content = translationsMap.vi.content;
        location = translationsMap.vi.location;
      }
    } else if (locale === 'en') {
      if (translationsMap.en) {
        title = translationsMap.en.title;
        slug = translationsMap.en.slug;
        shortDescription = translationsMap.en.shortDescription;
        content = translationsMap.en.content;
        location = translationsMap.en.location;
      }
    }

    return {
      ...item,
      title,
      slug,
      shortDescription,
      content,
      location,
      translations: translationsMap,
    };
  }

  private async queryAll(publishedOnly: boolean, locale?: 'vi' | 'en') {
    const records = await this.db.query.newsEvents.findMany({
      where: publishedOnly ? eq(schema.newsEvents.status, 'published') : undefined,
      orderBy: (news, { desc }) => [desc(news.createdAt)],
      with: {
        thumbnailImage: true,
        author: { columns: { id: true, fullName: true } },
        translations: true,
      },
    });

    const formatted = records.map((item) => this.formatItem(item, locale));

    if (locale === 'en') {
      // Policy A: When locale=en is explicitly requested, only published items with
      // an authored English translation are returned. VI-only items are filtered out.
      return formatted.filter((item) => item.translations.en !== null);
    }

    return formatted;
  }

  findOne(idOrSlug: string, locale?: string) {
    const validLocale = this.validateLocale(locale);
    return this.queryOne(idOrSlug, false, validLocale);
  }

  findPublishedByIdOrSlug(idOrSlug: string, locale?: string) {
    const validLocale = this.validateLocale(locale);
    return this.queryOne(idOrSlug, true, validLocale);
  }

  private async queryOne(idOrSlug: string, publishedOnly: boolean, locale?: 'vi' | 'en') {
    const isUuid = isValidUuid(idOrSlug);
    let targetId = isUuid ? idOrSlug : undefined;

    // Check if idOrSlug matches a translation slug
    if (!targetId && this.db.query.newsEventTranslations?.findFirst) {
      try {
        const trans = await this.db.query.newsEventTranslations.findFirst({
          where: eq(schema.newsEventTranslations.slug, idOrSlug),
        });
        if (trans) {
          targetId = trans.newsEventId;
        }
      } catch {
        // Fallback for mocks without translations query table
      }
    }

    const item = await this.db.query.newsEvents.findFirst({
      where: (news, { eq, and }) =>
        and(
          targetId ? eq(news.id, targetId) : eq(news.slug, idOrSlug),
          publishedOnly ? eq(news.status, 'published') : undefined,
        ),
      with: {
        thumbnailImage: true,
        author: { columns: { id: true, fullName: true } },
        translations: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`News/Event "${idOrSlug}" not found`);
    }

    const formatted = this.formatItem(item, locale);

    if (locale === 'en') {
      // Policy A: If requested in English, but article has no authored EN translation,
      // reject with 404 (not found in English). Never return Vietnamese as English.
      if (!formatted.translations.en) {
        throw new NotFoundException(`News/Event "${idOrSlug}" is not available in "en" locale`);
      }
    }

    return formatted;
  }

  private eventDate(value: string | null | undefined, field: string) {
    if (value === undefined || value === null) return value;
    // Require an explicit timezone so conversion never depends on server locale.
    if (
      typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
      !isISO8601(value, { strict: true, strictSeparator: true })
    ) {
      throw new BadRequestException(`${field} must be an ISO 8601 timestamp with timezone or null`);
    }
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) {
      throw new BadRequestException(`${field} must be a valid date`);
    }
    return date;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private normalizeContent(content: any): any {
    if (content === undefined) return undefined;
    if (content === null) return null;
    if (typeof content === 'string') {
      try {
        return JSON.parse(content);
      } catch {
        return content;
      }
    }
    return content;
  }

  private writableFields(data: UpdateNewsEventDto) {
    let thumbnailImageId = data.thumbnailImageId;
    if (thumbnailImageId !== undefined && thumbnailImageId !== null) {
      if (typeof thumbnailImageId !== 'string') {
        throw new BadRequestException('thumbnailImageId must be a UUID or null');
      }
      thumbnailImageId = thumbnailImageId.trim() || null;
      if (thumbnailImageId !== null && !isValidUuid(thumbnailImageId)) {
        throw new BadRequestException('thumbnailImageId must be a UUID or null');
      }
    }

    // Runtime allowlist also protects writes from legacy clients posting metadata.
    return {
      type: data.type,
      title: data.title,
      slug: data.slug,
      shortDescription: data.shortDescription,
      thumbnailImageId,
      status: data.status,
      content: this.normalizeContent(data.content),
      location: data.location,
      eventStartAt: this.eventDate(data.eventStartAt, 'eventStartAt'),
      eventEndAt: this.eventDate(data.eventEndAt, 'eventEndAt'),
    };
  }

  async create(data: CreateNewsEventDto) {
    const fields = this.writableFields(data);

    // Extract VI translation
    const viInput = data.translations?.vi;
    const viTitle = (viInput?.title || data.title || '').trim();
    if (!viTitle) {
      throw new BadRequestException('Vietnamese title is required');
    }

    const rawViSlug = viInput?.slug || data.slug;
    const viSlug = (rawViSlug ? String(rawViSlug).trim() : this.slugify(viTitle)).trim();
    if (!viSlug) {
      throw new BadRequestException('Vietnamese slug cannot be empty');
    }

    const viShortDescription =
      viInput?.shortDescription !== undefined ? viInput.shortDescription : data.shortDescription;
    const viContent = this.normalizeContent(
      viInput?.content !== undefined ? viInput.content : data.content,
    );
    const viLocation = viInput?.location !== undefined ? viInput.location : data.location;
    const viSeoTitle = viInput?.seoTitle ?? null;
    const viSeoDescription = viInput?.seoDescription ?? null;

    // Extract optional EN translation
    const enInput = data.translations?.en;
    let enData: {
      title: string;
      slug: string;
      shortDescription: string | null;
      content: any;
      location: string | null;
      seoTitle: string | null;
      seoDescription: string | null;
    } | null = null;

    if (enInput && enInput.title && String(enInput.title).trim().length > 0) {
      const enTitle = String(enInput.title).trim();
      const enSlug = (enInput.slug ? String(enInput.slug).trim() : this.slugify(enTitle)).trim();
      if (!enSlug) {
        throw new BadRequestException('English slug cannot be empty');
      }
      if (enSlug === viSlug) {
        throw new ConflictException('English slug cannot be identical to Vietnamese slug');
      }
      enData = {
        title: enTitle,
        slug: enSlug,
        shortDescription: enInput.shortDescription ?? null,
        content: this.normalizeContent(enInput.content ?? null),
        location: enInput.location ?? null,
        seoTitle: enInput.seoTitle ?? null,
        seoDescription: enInput.seoDescription ?? null,
      };
    }

    const runTx =
      typeof this.db.transaction === 'function'
        ? (cb: (tx: any) => Promise<any>) => this.db.transaction(cb)
        : (cb: (tx: any) => Promise<any>) => cb(this.db);

    const createdId = await runTx(async (tx) => {
      // 1. Insert news_events (mirroring VI fields to parent legacy columns)
      const [created] = await tx
        .insert(schema.newsEvents)
        .values({
          ...fields,
          type: data.type,
          title: viTitle,
          slug: viSlug,
          shortDescription: viShortDescription,
          content: viContent,
          location: viLocation,
          publishedAt: new Date(),
        })
        .returning();

      // 2. Insert news_event_translations (VI)
      await tx.insert(schema.newsEventTranslations).values({
        newsEventId: created.id,
        locale: 'vi',
        title: viTitle,
        slug: viSlug,
        shortDescription: viShortDescription,
        content: viContent,
        location: viLocation,
        seoTitle: viSeoTitle,
        seoDescription: viSeoDescription,
      });

      // 3. Insert news_event_translations (EN) if authored data is provided
      if (enData) {
        await tx.insert(schema.newsEventTranslations).values({
          newsEventId: created.id,
          locale: 'en',
          title: enData.title,
          slug: enData.slug,
          shortDescription: enData.shortDescription,
          content: enData.content,
          location: enData.location,
          seoTitle: enData.seoTitle,
          seoDescription: enData.seoDescription,
        });
      }

      return created.id;
    });

    return this.findOne(createdId);
  }

  async update(id: string, data: UpdateNewsEventDto) {
    const fields = this.writableFields(data);

    // Extract VI updates if provided
    const viInput = data.translations?.vi;
    const hasViTranslation = viInput !== undefined;
    const hasLegacyVi =
      data.title !== undefined ||
      data.slug !== undefined ||
      data.shortDescription !== undefined ||
      data.content !== undefined ||
      data.location !== undefined;

    let viUpdate: Partial<NewsEventTranslationInput> | null = null;
    if (hasViTranslation || hasLegacyVi) {
      viUpdate = {};
      if (viInput?.title !== undefined) viUpdate.title = viInput.title;
      else if (data.title !== undefined) viUpdate.title = data.title;

      if (viInput?.slug !== undefined) viUpdate.slug = viInput.slug;
      else if (data.slug !== undefined) viUpdate.slug = data.slug;

      if (viInput?.shortDescription !== undefined) viUpdate.shortDescription = viInput.shortDescription;
      else if (data.shortDescription !== undefined) viUpdate.shortDescription = data.shortDescription;

      if (viInput?.content !== undefined) viUpdate.content = this.normalizeContent(viInput.content);
      else if (data.content !== undefined) viUpdate.content = this.normalizeContent(data.content);

      if (viInput?.location !== undefined) viUpdate.location = viInput.location;
      else if (data.location !== undefined) viUpdate.location = data.location;

      if (viInput?.seoTitle !== undefined) viUpdate.seoTitle = viInput.seoTitle;
      if (viInput?.seoDescription !== undefined) viUpdate.seoDescription = viInput.seoDescription;

      if (viUpdate.title !== undefined) {
        if (typeof viUpdate.title !== 'string' || !viUpdate.title.trim()) {
          throw new BadRequestException('Vietnamese title is required');
        }
        viUpdate.title = viUpdate.title.trim();
      }
      if (viUpdate.slug !== undefined) {
        if (typeof viUpdate.slug !== 'string' || !viUpdate.slug.trim()) {
          throw new BadRequestException('Vietnamese slug cannot be empty');
        }
        viUpdate.slug = viUpdate.slug.trim();
      }
    }

    // Extract EN updates if provided
    const enInput = data.translations?.en;

    const runTx =
      typeof this.db.transaction === 'function'
        ? (cb: (tx: any) => Promise<any>) => this.db.transaction(cb)
        : (cb: (tx: any) => Promise<any>) => cb(this.db);

    await runTx(async (tx) => {
      // 1. Update news_events (common fields + mirrored VI fields)
      const parentUpdates: Record<string, any> = { updatedAt: new Date() };
      for (const [key, val] of Object.entries(fields)) {
        if (val !== undefined) {
          parentUpdates[key] = val;
        }
      }
      if (viUpdate) {
        if (viUpdate.title !== undefined) parentUpdates.title = viUpdate.title;
        if (viUpdate.slug !== undefined) parentUpdates.slug = viUpdate.slug;
        if (viUpdate.shortDescription !== undefined) parentUpdates.shortDescription = viUpdate.shortDescription;
        if (viUpdate.content !== undefined) parentUpdates.content = viUpdate.content;
        if (viUpdate.location !== undefined) parentUpdates.location = viUpdate.location;
      }

      const [updated] = await tx
        .update(schema.newsEvents)
        .set(parentUpdates)
        .where(eq(schema.newsEvents.id, id))
        .returning();

      if (!updated) {
        throw new NotFoundException(`News/Event with id ${id} not found`);
      }

      // 2. Update news_event_translations (VI) if VI fields were modified
      if (viUpdate) {
        const transUpdate: Record<string, any> = { updatedAt: new Date() };
        for (const [key, val] of Object.entries(viUpdate)) {
          if (val !== undefined) transUpdate[key] = val;
        }
        await tx
          .update(schema.newsEventTranslations)
          .set(transUpdate)
          .where(
            and(
              eq(schema.newsEventTranslations.newsEventId, id),
              eq(schema.newsEventTranslations.locale, 'vi'),
            ),
          );
      }

      // 3. Update or Insert news_event_translations (EN) if EN translation is provided
      if (enInput !== undefined && enInput !== null && enInput.title && String(enInput.title).trim()) {
        const enTitle = String(enInput.title).trim();
        const enSlug = (enInput.slug ? String(enInput.slug).trim() : this.slugify(enTitle)).trim();
        const enValues = {
          title: enTitle,
          slug: enSlug,
          shortDescription: enInput.shortDescription ?? null,
          content: this.normalizeContent(enInput.content ?? null),
          location: enInput.location ?? null,
          seoTitle: enInput.seoTitle ?? null,
          seoDescription: enInput.seoDescription ?? null,
          updatedAt: new Date(),
        };

        // Try updating existing EN translation
        const updatedEn = await tx
          .update(schema.newsEventTranslations)
          .set(enValues)
          .where(
            and(
              eq(schema.newsEventTranslations.newsEventId, id),
              eq(schema.newsEventTranslations.locale, 'en'),
            ),
          )
          .returning();

        // If no EN translation existed yet, insert a new one
        if (!updatedEn || updatedEn.length === 0) {
          await tx.insert(schema.newsEventTranslations).values({
            newsEventId: id,
            locale: 'en',
            ...enValues,
          });
        }
      }
    });

    return this.findOne(id);
  }

  async delete(id: string) {
    const [deleted] = await this.db
      .delete(schema.newsEvents)
      .where(eq(schema.newsEvents.id, id))
      .returning();
    if (!deleted) throw new NotFoundException(`News/Event with id ${id} not found`);
    return { success: true, deleted };
  }
}
