import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../../database/database.module.js';
import * as schema from '../../database/schema.js';
import { isValidUuid } from '../../common/uuid.util.js';
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
    if (!isValidUuid(id)) {
      throw new NotFoundException(`Media asset with id ${id} not found`);
    }
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
    try {
      const [created] = await this.db.insert(schema.mediaAssets).values(insert).returning();
      return created;
    } catch (err: any) {
      const pgCode = err?.code || err?.cause?.code;
      if (pgCode === '23505') {
        throw new ConflictException(`Media asset with storageKey "${data.storageKey}" already exists`);
      }
      throw err;
    }
  }

  async delete(id: string) {
    if (!isValidUuid(id)) {
      throw new NotFoundException(`Media asset with id ${id} not found`);
    }
    try {
      const [deleted] = await this.db
        .delete(schema.mediaAssets)
        .where(eq(schema.mediaAssets.id, id))
        .returning();
      if (!deleted) throw new NotFoundException(`Media asset with id ${id} not found`);
      return { success: true, deleted };
    } catch (err: any) {
      const pgCode = err?.code || err?.cause?.code;
      if (pgCode === '23503') {
        throw new ConflictException('Không thể xóa tệp media đang được sử dụng.');
      }
      throw err;
    }
  }
}
