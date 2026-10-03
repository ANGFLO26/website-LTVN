import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../../database/database.module.js';
import * as schema from '../../database/schema.js';

import { isValidUuid } from '../../common/uuid.util.js';
import { CONTACT_REQUEST_TYPES, type PublicContactDto } from './dto/public-contact.dto.js';

@Injectable()
export class ContactsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findAll() {
    return this.db.query.contacts.findMany({
      orderBy: (contacts, { desc }) => [desc(contacts.createdAt)],
      with: {
        assignedUser: { columns: { id: true, fullName: true } },
      },
    });
  }

  async findOne(id: string) {
    const contact = await this.db.query.contacts.findFirst({
      where: eq(schema.contacts.id, id),
      with: {
        assignedUser: { columns: { id: true, fullName: true } },
      },
    });
    if (!contact) throw new NotFoundException(`Contact with id ${id} not found`);
    return contact;
  }

  async create(data: PublicContactDto) {
    return await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(schema.contacts)
        .values({
          fullName: data.fullName,
          companyName: data.companyName,
          email: data.email,
          phone: data.phone,
          subject: CONTACT_REQUEST_TYPES[data.requestType],
          message: data.message,
          status: 'new',
          assignedTo: null,
          adminNote: null,
          resolvedAt: null,
        })
        .returning();

      await tx.insert(schema.contactOutbox).values({
        contactId: created.id,
        eventType: 'contact.notification.requested',
        status: 'pending',
        attemptCount: 0,
        nextAttemptAt: new Date(),
        lastError: null,
        processedAt: null,
      });

      return {
        message: 'Yêu cầu của bạn đã được tiếp nhận.',
        id: created.id,
      };
    });
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
