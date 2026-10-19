import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../../database/database.module.js';
import * as schema from '../../database/schema.js';
import { isValidUuid } from '../../common/uuid.util.js';

import type { CreateUserDto, UpdateUserDto } from './dto/user-mutation.dto.js';

function isUniqueConstraintError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const candidate = err as { code?: unknown; cause?: { code?: unknown } };
  return candidate.code === '23505' || candidate.cause?.code === '23505';
}

function isForeignKeyConstraintError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const candidate = err as { code?: unknown; cause?: { code?: unknown } };
  return candidate.code === '23503' || candidate.cause?.code === '23503';
}

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findAll() {
    return this.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        fullName: schema.users.fullName,
        role: schema.users.role,
        status: schema.users.status,
        lastLoginAt: schema.users.lastLoginAt,
        createdAt: schema.users.createdAt,
        updatedAt: schema.users.updatedAt,
      })
      .from(schema.users)
      .orderBy(desc(schema.users.createdAt));
  }

  async findOne(id: string) {
    if (!isValidUuid(id)) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    const [user] = await this.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        fullName: schema.users.fullName,
        role: schema.users.role,
        status: schema.users.status,
        lastLoginAt: schema.users.lastLoginAt,
        createdAt: schema.users.createdAt,
        updatedAt: schema.users.updatedAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, id));
    if (!user) throw new NotFoundException(`User with id ${id} not found`);
    return user;
  }

  async create(data: CreateUserDto) {
    try {
      const [created] = await this.db
        .insert(schema.users)
        .values({
          email: data.email,
          fullName: data.fullName,
          role: data.role,
          status: data.status,
          // Retain the existing non-login placeholder; provisioning is outside QA-03.
          passwordHash: '$2b$10$defaultPasswordHashPlaceholder',
        })
        .returning({
          id: schema.users.id,
          email: schema.users.email,
          fullName: schema.users.fullName,
          role: schema.users.role,
          status: schema.users.status,
          lastLoginAt: schema.users.lastLoginAt,
          createdAt: schema.users.createdAt,
          updatedAt: schema.users.updatedAt,
        });
      return created;
    } catch (err: unknown) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException('Email đã tồn tại trong hệ thống.');
      }
      throw err;
    }
  }

  async update(id: string, data: UpdateUserDto) {
    let updated;
    try {
      [updated] = await this.db
        .update(schema.users)
        .set({
          email: data.email,
          fullName: data.fullName,
          role: data.role,
          status: data.status,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, id))
        .returning({
          id: schema.users.id,
          email: schema.users.email,
          fullName: schema.users.fullName,
          role: schema.users.role,
          status: schema.users.status,
          lastLoginAt: schema.users.lastLoginAt,
          createdAt: schema.users.createdAt,
          updatedAt: schema.users.updatedAt,
        });
    } catch (err: unknown) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException('Email đã tồn tại trong hệ thống.');
      }
      throw err;
    }
    if (!updated) throw new NotFoundException(`User with id ${id} not found`);
    return updated;
  }

  async delete(id: string) {
    if (!isValidUuid(id)) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    try {
      const [deleted] = await this.db
        .delete(schema.users)
        .where(eq(schema.users.id, id))
        .returning({ id: schema.users.id, email: schema.users.email });
      if (!deleted) throw new NotFoundException(`User with id ${id} not found`);
      return { success: true, deleted };
    } catch (err: unknown) {
      if (isForeignKeyConstraintError(err)) {
        throw new ConflictException(
          'Không thể xóa tài khoản đang gắn với dữ liệu hệ thống (bài viết, liên hệ hoặc cấu hình). Vui lòng chuyển sang trạng thái Ngừng hoạt động (inactive).',
        );
      }
      throw err;
    }
  }
}
