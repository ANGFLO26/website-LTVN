import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { eq, asc } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../../database/database.module.js';
import * as schema from '../../database/schema.js';
import { isValidUuid } from '../../common/uuid.util.js';
import type { CreateStandardDto, UpdateStandardDto } from './dto/standard-mutation.dto.js';

function getPgCode(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const candidate = err as { code?: unknown; cause?: { code?: unknown } };
  if (typeof candidate.code === 'string') return candidate.code;
  if (typeof candidate.cause?.code === 'string') return candidate.cause.code;
  return undefined;
}

@Injectable()
export class StandardsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findAll() {
    return this.db.select().from(schema.standards).orderBy(asc(schema.standards.code));
  }

  async findOne(id: string) {
    if (!isValidUuid(id)) throw new BadRequestException('ID tiêu chuẩn không hợp lệ.');
    const [result] = await this.db
      .select()
      .from(schema.standards)
      .where(eq(schema.standards.id, id));
    if (!result) throw new NotFoundException(`Standard with id ${id} not found`);
    return result;
  }

  async create(data: CreateStandardDto) {
    try {
      const [created] = await this.db
        .insert(schema.standards)
        .values({
          code: data.code,
          organization: data.organization,
          year: data.year,
          title: data.title,
          description: data.description,
        })
        .returning();
      return created;
    } catch (err: unknown) {
      if (getPgCode(err) === '23505') {
        throw new ConflictException('Mã tiêu chuẩn quốc tế đã tồn tại trong hệ thống.');
      }
      throw err;
    }
  }

  async update(id: string, data: UpdateStandardDto) {
    let updated;
    try {
      [updated] = await this.db
        .update(schema.standards)
        .set({
          code: data.code,
          organization: data.organization,
          year: data.year,
          title: data.title,
          description: data.description,
          updatedAt: new Date(),
        })
        .where(eq(schema.standards.id, id))
        .returning();
    } catch (err: unknown) {
      if (getPgCode(err) === '23505') {
        throw new ConflictException('Mã tiêu chuẩn quốc tế đã tồn tại trong hệ thống.');
      }
      throw err;
    }
    if (!updated) throw new NotFoundException(`Standard with id ${id} not found`);
    return updated;
  }

  async delete(id: string) {
    if (!isValidUuid(id)) throw new BadRequestException('ID tiêu chuẩn không hợp lệ.');
    try {
      const [deleted] = await this.db
        .delete(schema.standards)
        .where(eq(schema.standards.id, id))
        .returning();
      if (!deleted) throw new NotFoundException(`Standard with id ${id} not found`);
      return { success: true, deleted };
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      if (getPgCode(err) === '23503') {
        throw new ConflictException('Không thể xóa tiêu chuẩn đang được gán cho thiết bị.');
      }
      throw err;
    }
  }
}
