import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../../database/database.module.js';
import * as schema from '../../database/schema.js';

import { sanitizeUuid, isValidUuid } from '../../common/uuid.util.js';

export interface CreateMachineDto extends schema.NewMachine {
  specs?: Array<{
    groupName: string;
    specName: string;
    specValue: string;
    unit?: string | null;
    sortOrder?: number;
  }>;
  applications?: Array<{
    title: string;
    description?: string | null;
    sortOrder?: number;
  }>;
  highlights?: Array<{
    title: string;
    description?: string | null;
    icon?: string | null;
    sortOrder?: number;
  }>;
  standards?: Array<{
    standardId: string;
    note?: string | null;
    sortOrder?: number;
  }>;
}

@Injectable()
export class MachinesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findAll() {
    return this.db.query.machines.findMany({
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

  async findOne(idOrSlug: string) {
    const isUuid = isValidUuid(idOrSlug);
    const machine = await this.db.query.machines.findFirst({
      where: (machines, { eq }) =>
        isUuid ? eq(machines.id, idOrSlug) : eq(machines.slug, idOrSlug),
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

  async create(data: CreateMachineDto) {
    const { specs, applications, highlights, standards, ...rawFields } = data;
    const machineFields = sanitizeUuid(rawFields);
    if (machineFields.mainImageId && !isValidUuid(machineFields.mainImageId)) {
      machineFields.mainImageId = null;
    }

    const machineId = await this.db.transaction(async (tx) => {
      const [machine] = await tx
        .insert(schema.machines)
        .values({
          ...machineFields,
          slug:
            machineFields.slug ||
            machineFields.name
              .toLowerCase()
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

  async update(id: string, data: Partial<CreateMachineDto>) {
    const { specs, applications, highlights, standards, ...rawFields } = data;
    const machineFields = { ...rawFields };
    if (machineFields.mainImageId !== undefined && machineFields.mainImageId && !isValidUuid(machineFields.mainImageId)) {
      machineFields.mainImageId = null;
    }

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
