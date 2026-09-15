import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../../database/database.module.js';
import * as schema from '../../database/schema.js';

import { sanitizeUuid } from '../../common/uuid.util.js';

@Injectable()
export class MediaService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findAll() {
    return this.db
      .select()
      .from(schema.mediaAssets)
      .orderBy(desc(schema.mediaAssets.createdAt));
  }

  async findOne(id: string) {
    const [result] = await this.db
      .select()
      .from(schema.mediaAssets)
      .where(eq(schema.mediaAssets.id, id));
    if (!result) throw new NotFoundException(`Media asset with id ${id} not found`);
    return result;
  }

  async create(data: schema.NewMediaAsset) {
    const cleanData = sanitizeUuid(data);
    const [created] = await this.db.insert(schema.mediaAssets).values(cleanData).returning();
    return created;
  }

  async delete(id: string) {
    const [deleted] = await this.db
      .delete(schema.mediaAssets)
      .where(eq(schema.mediaAssets.id, id))
      .returning();
    if (!deleted) throw new NotFoundException(`Media asset with id ${id} not found`);
    return { success: true, deleted };
  }
}
