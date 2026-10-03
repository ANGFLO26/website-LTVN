import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, asc } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../../database/database.module.js';
import * as schema from '../../database/schema.js';
import type { CreateStandardDto, UpdateStandardDto } from './dto/standard-mutation.dto.js';

@Injectable()
export class StandardsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findAll() {
    return this.db.select().from(schema.standards).orderBy(asc(schema.standards.code));
  }

  async findOne(id: string) {
    const [result] = await this.db
      .select()
      .from(schema.standards)
      .where(eq(schema.standards.id, id));
    if (!result) throw new NotFoundException(`Standard with id ${id} not found`);
    return result;
  }

  async create(data: CreateStandardDto) {
    const [created] = await this.db.insert(schema.standards).values({
      code: data.code,
      organization: data.organization,
      year: data.year,
      title: data.title,
      description: data.description,
    }).returning();
    return created;
  }

  async update(id: string, data: UpdateStandardDto) {
    const [updated] = await this.db
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
    if (!updated) throw new NotFoundException(`Standard with id ${id} not found`);
    return updated;
  }

  async delete(id: string) {
    const [deleted] = await this.db
      .delete(schema.standards)
      .where(eq(schema.standards.id, id))
      .returning();
    if (!deleted) throw new NotFoundException(`Standard with id ${id} not found`);
    return { success: true, deleted };
  }
}
