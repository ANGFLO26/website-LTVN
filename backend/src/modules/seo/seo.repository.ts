import { Injectable, Inject } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../../database/database.module.js';
import * as schema from '../../database/schema.js';

export interface SeoPublishedMachine {
  slug: string;
  name: string;
  model?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  status: string;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  publishedAt?: Date | null;
  mainImage?: {
    publicUrl?: string | null;
  } | null;
}

export interface SeoPublishedNewsTranslation {
  locale: string;
  slug: string;
  title: string;
  shortDescription?: string | null;
  seoDescription?: string | null;
  updatedAt?: Date | null;
}

export interface SeoPublishedNews {
  id: string;
  slug: string;
  title: string;
  shortDescription?: string | null;
  status: string;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  publishedAt?: Date | null;
  thumbnailImage?: {
    publicUrl?: string | null;
  } | null;
  translations?: SeoPublishedNewsTranslation[] | null;
}

export interface SeoMatchedNewsResult {
  news: SeoPublishedNews;
  matchedTranslation?: SeoPublishedNewsTranslation | null;
  isEnglish: boolean;
}

export interface ISeoRepository {
  findPublishedMachineBySlug(slug: string): Promise<SeoPublishedMachine | null>;
  findPublishedNewsBySlug(slug: string): Promise<SeoMatchedNewsResult | null>;
  findAllPublishedMachinesForSitemap(): Promise<
    Array<{ slug: string; updatedAt?: Date | null; publishedAt?: Date | null }>
  >;
  findAllPublishedNewsForSitemap(): Promise<
    Array<{
      slug: string;
      updatedAt?: Date | null;
      publishedAt?: Date | null;
      translations?: Array<{
        locale: string;
        slug: string;
        updatedAt?: Date | null;
      }> | null;
    }>
  >;
}

export const SEO_REPOSITORY = 'SEO_REPOSITORY';

@Injectable()
export class DrizzleSeoRepository implements ISeoRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findPublishedMachineBySlug(slug: string): Promise<SeoPublishedMachine | null> {
    if (!this.db?.query?.machines?.findFirst) {
      return null;
    }

    const found = await this.db.query.machines.findFirst({
      where: and(
        eq(schema.machines.slug, slug),
        eq(schema.machines.status, 'published'),
        isNull(schema.machines.deletedAt),
      ),
      with: {
        mainImage: true,
      },
    });
    return (found as unknown as SeoPublishedMachine) ?? null;
  }

  async findPublishedNewsBySlug(slug: string): Promise<SeoMatchedNewsResult | null> {
    if (!this.db?.query?.newsEvents) {
      return null;
    }

    // 1. Check if slug matches an authored translation
    if (this.db.query.newsEventTranslations?.findFirst) {
      const trans = (await this.db.query.newsEventTranslations.findFirst({
        where: eq(schema.newsEventTranslations.slug, slug),
      })) as unknown as SeoPublishedNewsTranslation & { newsEventId: string } | null;

      if (trans && trans.newsEventId) {
        const parent = (await this.db.query.newsEvents.findFirst({
          where: and(
            eq(schema.newsEvents.id, trans.newsEventId),
            eq(schema.newsEvents.status, 'published'),
            isNull(schema.newsEvents.deletedAt),
          ),
          with: {
            thumbnailImage: true,
            translations: true,
          },
        })) as unknown as SeoPublishedNews | null;

        if (parent) {
          return {
            news: parent,
            matchedTranslation: trans,
            isEnglish: trans.locale === 'en',
          };
        }
      }
    }

    // 2. Check if slug matches primary Vietnamese news_events slug
    if (this.db.query.newsEvents.findFirst) {
      const found = (await this.db.query.newsEvents.findFirst({
        where: and(
          eq(schema.newsEvents.slug, slug),
          eq(schema.newsEvents.status, 'published'),
          isNull(schema.newsEvents.deletedAt),
        ),
        with: {
          thumbnailImage: true,
          translations: true,
        },
      })) as unknown as SeoPublishedNews | null;

      if (found) {
        const viTrans = found.translations?.find((t) => t.locale === 'vi');
        return {
          news: found,
          matchedTranslation: viTrans ?? null,
          isEnglish: false,
        };
      }
    }

    return null;
  }

  async findAllPublishedMachinesForSitemap(): Promise<
    Array<{ slug: string; updatedAt?: Date | null; publishedAt?: Date | null }>
  > {
    if (!this.db?.query?.machines?.findMany) {
      return [];
    }
    const records = await this.db.query.machines.findMany({
      where: and(
        eq(schema.machines.status, 'published'),
        isNull(schema.machines.deletedAt),
      ),
      columns: {
        slug: true,
        updatedAt: true,
        publishedAt: true,
      },
      orderBy: (m, { asc }) => [asc(m.sortOrder)],
    });
    return records as Array<{ slug: string; updatedAt?: Date | null; publishedAt?: Date | null }>;
  }

  async findAllPublishedNewsForSitemap(): Promise<
    Array<{
      slug: string;
      updatedAt?: Date | null;
      publishedAt?: Date | null;
      translations?: Array<{
        locale: string;
        slug: string;
        updatedAt?: Date | null;
      }> | null;
    }>
  > {
    if (!this.db?.query?.newsEvents?.findMany) {
      return [];
    }
    const records = await this.db.query.newsEvents.findMany({
      where: and(
        eq(schema.newsEvents.status, 'published'),
        isNull(schema.newsEvents.deletedAt),
      ),
      columns: {
        slug: true,
        updatedAt: true,
        publishedAt: true,
      },
      with: {
        translations: {
          columns: {
            locale: true,
            slug: true,
            updatedAt: true,
          },
        },
      },
      orderBy: (n, { desc }) => [desc(n.publishedAt)],
    });
    return records as unknown as Array<{
      slug: string;
      updatedAt?: Date | null;
      publishedAt?: Date | null;
      translations?: Array<{
        locale: string;
        slug: string;
        updatedAt?: Date | null;
      }> | null;
    }>;
  }
}
