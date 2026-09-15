import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../../database/database.module.js';
import * as schema from '../../database/schema.js';

import { sanitizeUuid, isValidUuid } from '../../common/uuid.util.js';

@Injectable()
export class ContactsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findAll() {
    return this.db.query.contacts.findMany({
      orderBy: (contacts, { desc }) => [desc(contacts.createdAt)],
      with: {
        assignedUser: true,
      },
    });
  }

  async findOne(id: string) {
    const contact = await this.db.query.contacts.findFirst({
      where: eq(schema.contacts.id, id),
      with: {
        assignedUser: true,
      },
    });
    if (!contact) throw new NotFoundException(`Contact with id ${id} not found`);
    return contact;
  }

  async create(data: schema.NewContact) {
    const cleanData = sanitizeUuid(data);
    if (cleanData.assignedTo && !isValidUuid(cleanData.assignedTo)) {
      cleanData.assignedTo = null;
    }
    const [created] = await this.db.insert(schema.contacts).values(cleanData).returning();
    return created;
  }

  async update(id: string, data: Partial<schema.NewContact>) {
    const updatePayload: Record<string, unknown> = {
      ...data,
      updatedAt: new Date(),
    };
    if (updatePayload.assignedTo !== undefined && updatePayload.assignedTo && !isValidUuid(updatePayload.assignedTo as string)) {
      updatePayload.assignedTo = null;
    }
    if (data.status === 'resolved') {
      updatePayload.resolvedAt = new Date();
    }

    const [updated] = await this.db
      .update(schema.contacts)
      .set(updatePayload)
      .where(eq(schema.contacts.id, id))
      .returning();
    if (!updated) throw new NotFoundException(`Contact with id ${id} not found`);
    return this.findOne(id);
  }

  async delete(id: string) {
    const [deleted] = await this.db
      .delete(schema.contacts)
      .where(eq(schema.contacts.id, id))
      .returning();
    if (!deleted) throw new NotFoundException(`Contact with id ${id} not found`);
    return { success: true, deleted };
  }
}
