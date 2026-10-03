import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../../database/database.module.js';
import * as schema from '../../database/schema.js';
import type { CreateMediaDto } from './dto/create-media.dto.js';

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

  async create(data: CreateMediaDto) {
    const insert: schema.NewMediaAsset = {
      fileName: data.fileName,
      storageKey: data.storageKey,
      publicUrl: data.publicUrl,
      altText: data.altText,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      width: data.width,
      height: data.height,
    };
    const [created] = await this.db.insert(schema.mediaAssets).values(insert).returning();
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
