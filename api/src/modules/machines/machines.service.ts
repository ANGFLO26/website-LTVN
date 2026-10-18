import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../../database/database.module.js';
import * as schema from '../../database/schema.js';

import { isValidUuid } from '../../common/uuid.util.js';
import type { CreateMachineDto, UpdateMachineDto } from './dto/machine-mutation.dto.js';

@Injectable()
export class MachinesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  findAll() {
    return this.queryAll(false);
  }

  findPublished() {
    return this.queryAll(true);
  }

  private async queryAll(publishedOnly: boolean) {
    return this.db.query.machines.findMany({
      where: publishedOnly ? eq(schema.machines.status, 'published') : undefined,
      orderBy: (machines, { asc }) => [asc(machines.sortOrder)],
      with: {
        mainImage: true,
        specs: {
          orderBy: (specs, { asc }) => [asc(specs.sortOrder)],
        },
        applications: {
          orderBy: (apps, { asc }) => [asc(apps.sortOrder)],
        },
        highlights: {
          orderBy: (hls, { asc }) => [asc(hls.sortOrder)],
        },
        standards: {
          with: {
            standard: true,
          },
        },
      },
    });
  }

  findOne(idOrSlug: string) {
    return this.queryOne(idOrSlug, false);
  }

  findPublishedByIdOrSlug(idOrSlug: string) {
    return this.queryOne(idOrSlug, true);
  }

  private async queryOne(idOrSlug: string, publishedOnly: boolean) {
    const isUuid = isValidUuid(idOrSlug);
    const machine = await this.db.query.machines.findFirst({
      where: (machines, { eq, and }) => and(
        isUuid ? eq(machines.id, idOrSlug) : eq(machines.slug, idOrSlug),
        publishedOnly ? eq(machines.status, 'published') : undefined,
      ),
      with: {
        mainImage: true,
        specs: true,
        applications: true,
        highlights: true,
        standards: {
          with: {
            standard: true,
          },
        },
      },
    });
    if (!machine) throw new NotFoundException(`Machine "${idOrSlug}" not found`);
    return machine;
  }

  private writableFields(data: UpdateMachineDto) {
    let mainImageId = data.mainImageId;
    if (mainImageId !== undefined && mainImageId !== null) {
      if (typeof mainImageId !== 'string') {
        throw new BadRequestException('mainImageId must be a UUID or null');
      }
      mainImageId = mainImageId.trim() || null;
      if (mainImageId !== null && !isValidUuid(mainImageId)) {
        throw new BadRequestException('mainImageId must be a UUID or null');
      }
    }

    // Enforce the allowlist at runtime, even for older clients posting metadata.
    return {
      name: data.name,
      slug: data.slug,
      model: data.model,
      shortDescription: data.shortDescription,
      description: data.description,
      mainImageId,
      status: data.status,
      sortOrder: data.sortOrder,
    };
  }

  async create(data: CreateMachineDto) {
    const { specs, applications, highlights, standards } = data;
    const machineFields = this.writableFields(data);

    const machineId = await this.db.transaction(async (tx) => {
      const [machine] = await tx
        .insert(schema.machines)
        .values({
          ...machineFields,
          name: data.name,
          slug:
            machineFields.slug ||
            data.name
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[đĐ]/g, 'd')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, ''),
        })
        .returning();

      if (specs && specs.length > 0) {
        await tx.insert(schema.machineSpecs).values(
          specs.map((s, idx) => ({
            machineId: machine.id,
            groupName: s.groupName,
            specName: s.specName,
            specValue: s.specValue,
            unit: s.unit || null,
            sortOrder: s.sortOrder ?? idx + 1,
          }))
        );
      }

      if (applications && applications.length > 0) {
        await tx.insert(schema.machineApplications).values(
          applications.map((a, idx) => ({
            machineId: machine.id,
            title: a.title,
            description: a.description || null,
            sortOrder: a.sortOrder ?? idx + 1,
          }))
        );
      }

      if (highlights && highlights.length > 0) {
        await tx.insert(schema.machineHighlights).values(
          highlights.map((h, idx) => ({
            machineId: machine.id,
            title: h.title,
            description: h.description || null,
            icon: h.icon || 'Zap',
            sortOrder: h.sortOrder ?? idx + 1,
          }))
        );
      }

      const validStandards = (standards || []).filter((st) => isValidUuid(st.standardId));
      if (validStandards.length > 0) {
        await tx.insert(schema.machineStandards).values(
          validStandards.map((st, idx) => ({
            machineId: machine.id,
            standardId: st.standardId,
            note: st.note || null,
            sortOrder: st.sortOrder ?? idx + 1,
          }))
        );
      }

      return machine.id;
    });

    return this.findOne(machineId);
  }

  async update(id: string, data: UpdateMachineDto) {
    const { specs, applications, highlights, standards } = data;
    const machineFields = this.writableFields(data);

    await this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(schema.machines)
        .set({ ...machineFields, updatedAt: new Date() })
        .where(eq(schema.machines.id, id))
        .returning();

      if (!updated) throw new NotFoundException(`Machine with id ${id} not found`);

      if (specs !== undefined) {
        await tx.delete(schema.machineSpecs).where(eq(schema.machineSpecs.machineId, id));
        if (specs.length > 0) {
          await tx.insert(schema.machineSpecs).values(
            specs.map((s, idx) => ({
              machineId: id,
              groupName: s.groupName,
              specName: s.specName,
              specValue: s.specValue,
              unit: s.unit || null,
              sortOrder: s.sortOrder ?? idx + 1,
            }))
          );
        }
      }

      if (applications !== undefined) {
        await tx
          .delete(schema.machineApplications)
          .where(eq(schema.machineApplications.machineId, id));
        if (applications.length > 0) {
          await tx.insert(schema.machineApplications).values(
            applications.map((a, idx) => ({
              machineId: id,
              title: a.title,
              description: a.description || null,
              sortOrder: a.sortOrder ?? idx + 1,
            }))
          );
        }
      }

      if (highlights !== undefined) {
        await tx
          .delete(schema.machineHighlights)
          .where(eq(schema.machineHighlights.machineId, id));
        if (highlights.length > 0) {
          await tx.insert(schema.machineHighlights).values(
            highlights.map((h, idx) => ({
              machineId: id,
              title: h.title,
              description: h.description || null,
              icon: h.icon || 'Zap',
              sortOrder: h.sortOrder ?? idx + 1,
            }))
          );
        }
      }

      if (standards !== undefined) {
        await tx
          .delete(schema.machineStandards)
          .where(eq(schema.machineStandards.machineId, id));
        const validStandards = standards.filter((st) => isValidUuid(st.standardId));
        if (validStandards.length > 0) {
          await tx.insert(schema.machineStandards).values(
            validStandards.map((st, idx) => ({
              machineId: id,
              standardId: st.standardId,
              note: st.note || null,
              sortOrder: st.sortOrder ?? idx + 1,
            }))
          );
        }
      }
    });

    return this.findOne(id);
  }

  async delete(id: string) {
    const [deleted] = await this.db
      .delete(schema.machines)
      .where(eq(schema.machines.id, id))
      .returning();
    if (!deleted) throw new NotFoundException(`Machine with id ${id} not found`);
    return { success: true, deleted };
  }
}
