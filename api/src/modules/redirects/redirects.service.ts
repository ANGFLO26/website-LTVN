import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { eq, desc, sql, and } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../../database/database.module.js';
import * as schema from '../../database/schema.js';
import { CreateRedirectDto } from './dto/create-redirect.dto.js';
import { UpdateRedirectDto } from './dto/update-redirect.dto.js';
import {
  validateRedirectPaths,
  normalizeRedirectPath,
  isReservedPath,
  detectCycleOrLoop,
} from './redirects.util.js';

export interface ResolvedRedirect {
  destinationPath: string;
  statusCode: number;
}

@Injectable()
export class RedirectsService {
  private readonly logger = new Logger(RedirectsService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  /**
   * Retrieves all redirects for Admin management.
   */
  async findAll(): Promise<schema.Redirect[]> {
    return this.db
      .select()
      .from(schema.redirects)
      .orderBy(desc(schema.redirects.createdAt));
  }

  /**
   * Retrieves a single redirect by UUID.
   */
  async findOne(id: string): Promise<schema.Redirect> {
    const [record] = await this.db
      .select()
      .from(schema.redirects)
      .where(eq(schema.redirects.id, id));

    if (!record) {
      throw new NotFoundException(`Không tìm thấy cấu hình chuyển hướng với ID: ${id}`);
    }
    return record;
  }

  /**
   * Creates a new 301 redirect mapping.
   */
  async create(dto: CreateRedirectDto): Promise<schema.Redirect> {
    const { sourcePath, destinationPath } = validateRedirectPaths(
      dto.sourcePath,
      dto.destinationPath
    );

    const created = await this.db.transaction(async (tx) => {
      // Same transaction-scoped PostgreSQL advisory lock for every graph mutation.
      // The graph must be read only after the lock has been acquired.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(1280599618, 1)`);
      const [existing] = await tx
        .select({ id: schema.redirects.id })
        .from(schema.redirects)
        .where(eq(schema.redirects.sourcePath, sourcePath));

      if (existing) {
        throw new ConflictException(
          `Đường dẫn nguồn "${sourcePath}" đã tồn tại trong danh sách chuyển hướng.`
        );
      }

      const allRedirects = await tx
        .select({
          id: schema.redirects.id,
          sourcePath: schema.redirects.sourcePath,
          destinationPath: schema.redirects.destinationPath,
          isActive: schema.redirects.isActive,
        })
        .from(schema.redirects);

      if (dto.isActive !== false) {
        detectCycleOrLoop(sourcePath, destinationPath, allRedirects);
      }

      const [inserted] = await tx
        .insert(schema.redirects)
        .values({
          sourcePath,
          destinationPath,
          statusCode: 301,
          isActive: dto.isActive !== undefined ? dto.isActive : true,
          notes: dto.notes?.trim() || null,
        })
        .returning();
      return inserted;
    });

    return created;
  }

  /**
   * Updates an existing redirect configuration.
   */
  async update(id: string, dto: UpdateRedirectDto): Promise<schema.Redirect> {
    const updated = await this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(1280599618, 1)`);
      const [current] = await tx.select().from(schema.redirects).where(eq(schema.redirects.id, id));
      if (!current) throw new NotFoundException(`Không tìm thấy cấu hình chuyển hướng với ID: ${id}`);

      const validated = validateRedirectPaths(
        dto.sourcePath !== undefined ? dto.sourcePath : current.sourcePath,
        dto.destinationPath !== undefined ? dto.destinationPath : current.destinationPath,
      );
      const isActive = dto.isActive !== undefined ? dto.isActive : current.isActive;

      if (validated.sourcePath !== current.sourcePath) {
        const [duplicate] = await tx
          .select({ id: schema.redirects.id })
          .from(schema.redirects)
          .where(eq(schema.redirects.sourcePath, validated.sourcePath));
        if (duplicate && duplicate.id !== id) {
          throw new ConflictException(
            `Đường dẫn nguồn "${validated.sourcePath}" đã tồn tại trong cấu hình khác.`
          );
        }
      }

      if (isActive) {
        const allRedirects = await tx
          .select({
            id: schema.redirects.id,
            sourcePath: schema.redirects.sourcePath,
            destinationPath: schema.redirects.destinationPath,
            isActive: schema.redirects.isActive,
          })
          .from(schema.redirects);
        detectCycleOrLoop(validated.sourcePath, validated.destinationPath, allRedirects, id);
      }

      const [saved] = await tx
        .update(schema.redirects)
        .set({
          sourcePath: validated.sourcePath,
          destinationPath: validated.destinationPath,
          isActive,
          notes: dto.notes !== undefined ? (dto.notes?.trim() || null) : current.notes,
          updatedAt: new Date(),
        })
        .where(eq(schema.redirects.id, id))
        .returning();
      return saved;
    });

    return updated;
  }

  /**
   * Toggles the active status of a redirect.
   */
  async toggle(id: string): Promise<schema.Redirect> {
    const updated = await this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(1280599618, 1)`);
      const [current] = await tx.select().from(schema.redirects).where(eq(schema.redirects.id, id));
      if (!current) throw new NotFoundException(`Không tìm thấy cấu hình chuyển hướng với ID: ${id}`);
      const newActiveState = !current.isActive;

      if (newActiveState) {
        const allRedirects = await tx
          .select({
            id: schema.redirects.id,
            sourcePath: schema.redirects.sourcePath,
            destinationPath: schema.redirects.destinationPath,
            isActive: schema.redirects.isActive,
          })
          .from(schema.redirects);
        detectCycleOrLoop(current.sourcePath, current.destinationPath, allRedirects, id);
      }

      const [saved] = await tx
        .update(schema.redirects)
        .set({ isActive: newActiveState, updatedAt: new Date() })
        .where(eq(schema.redirects.id, id))
        .returning();
      return saved;
    });

    return updated;
  }

  /**
   * Permanently deletes a redirect.
   */
  async remove(id: string): Promise<{ success: boolean; id: string }> {
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(1280599618, 1)`);
      const [current] = await tx.select({ id: schema.redirects.id }).from(schema.redirects).where(eq(schema.redirects.id, id));
      if (!current) throw new NotFoundException(`Không tìm thấy cấu hình chuyển hướng với ID: ${id}`);
      await tx.delete(schema.redirects).where(eq(schema.redirects.id, id));
    });

    return { success: true, id };
  }

  /**
   * Resolves an incoming request path to an active 301 destination.
   * Directly queries PostgreSQL so that both PM2 cluster instances
   * immediately see any changes without stale in-memory divergence.
   */
  async resolve(requestPath: string): Promise<ResolvedRedirect | null> {
    if (!requestPath || typeof requestPath !== 'string') return null;
    let normalized: string;
    try {
      normalized = normalizeRedirectPath(requestPath);
    } catch {
      return null;
    }
    if (isReservedPath(normalized)) return null;

    try {
      if (!this.db?.select) {
        return null;
      }

      const [matched] = await this.db
        .select({
          destinationPath: schema.redirects.destinationPath,
          statusCode: schema.redirects.statusCode,
          isActive: schema.redirects.isActive,
        })
        .from(schema.redirects)
        .where(
          and(eq(schema.redirects.sourcePath, normalized), eq(schema.redirects.isActive, true))
        )
        .limit(1);

      if (matched && matched.isActive) {
        // Existing rows may predate the current validator. Never emit an unsafe Location.
        const destinationPath = validateRedirectPaths(normalized, matched.destinationPath).destinationPath;
        return {
          destinationPath,
          statusCode: matched.statusCode || 301,
        };
      }
    } catch {
      this.logger.error('Redirect resolution failed.');
      return null;
    }

    return null;
  }
}
