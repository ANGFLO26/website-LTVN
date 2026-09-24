import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../../database/database.module.js';
import * as schema from '../../database/schema.js';

import { sanitizeUuid, isValidUuid } from '../../common/uuid.util.js';

@Injectable()
export class NewsEventsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findAll() {
    return this.db.query.newsEvents.findMany({
      orderBy: (news, { desc }) => [desc(news.createdAt)],
      with: {
        thumbnailImage: true,
        author: true,
      },
    });
  }

  async findOne(idOrSlug: string) {
    const isUuid = isValidUuid(idOrSlug);
    const item = await this.db.query.newsEvents.findFirst({
      where: (news, { eq }) =>
        isUuid ? eq(news.id, idOrSlug) : eq(news.slug, idOrSlug),
      with: {
        thumbnailImage: true,
        author: true,
      },
    });
    if (!item) throw new NotFoundException(`News/Event "${idOrSlug}" not found`);
    return item;
  }

  async create(data: schema.NewNewsEvent) {
    const cleanData = sanitizeUuid(data);
    if (cleanData.thumbnailImageId && !isValidUuid(cleanData.thumbnailImageId)) {
      cleanData.thumbnailImageId = null;
    }
    if (cleanData.authorId && !isValidUuid(cleanData.authorId)) {
      cleanData.authorId = null;
    }

    const [created] = await this.db
      .insert(schema.newsEvents)
      .values({
        ...cleanData,
        slug:
          cleanData.slug ||
          cleanData.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, ''),
      })
      .returning();
    return this.findOne(created.id);
  }

  async update(id: string, data: Partial<schema.NewNewsEvent>) {
    const updateData = { ...data };
    if (updateData.thumbnailImageId !== undefined && updateData.thumbnailImageId && !isValidUuid(updateData.thumbnailImageId)) {
      updateData.thumbnailImageId = null;
    }
    if (updateData.authorId !== undefined && updateData.authorId && !isValidUuid(updateData.authorId)) {
      updateData.authorId = null;
    }

    const [updated] = await this.db
      .update(schema.newsEvents)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(schema.newsEvents.id, id))
      .returning();
    if (!updated) throw new NotFoundException(`News/Event with id ${id} not found`);
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
