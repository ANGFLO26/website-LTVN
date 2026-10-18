import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../../database/database.module.js';
import * as schema from '../../database/schema.js';

import { isValidUuid } from '../../common/uuid.util.js';
import { CONTACT_REQUEST_TYPES, type PublicContactDto } from './dto/public-contact.dto.js';
import { ADMIN_CONTACT_STATUSES, type AdminUpdateContactDto } from './dto/admin-update-contact.dto.js';

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

  async update(id: string, data: AdminUpdateContactDto) {
    if (!isValidUuid(id)) throw new BadRequestException('ID liên hệ không hợp lệ.');
    const updatePayload: Partial<schema.NewContact> = { updatedAt: new Date() };
    if (data.status !== undefined) {
      if (!ADMIN_CONTACT_STATUSES.includes(data.status)) {
        throw new BadRequestException('Trạng thái liên hệ không hợp lệ.');
      }
      updatePayload.status = data.status;
    }
    if (data.assignedTo !== undefined) {
      if (data.assignedTo !== null && !isValidUuid(data.assignedTo)) {
        throw new BadRequestException('ID người phụ trách không hợp lệ.');
      }
      updatePayload.assignedTo = data.assignedTo;
    }
    if (data.adminNote !== undefined) updatePayload.adminNote = data.adminNote;
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
    if (!id || typeof id !== 'string' || !isValidUuid(id)) {
      throw new BadRequestException('ID liên hệ không hợp lệ.');
    }

    // Fast-path check: contact with outbox records must not be deleted (durability & audit trail)
    const outboxEntry = await this.db.query.contactOutbox.findFirst({
      where: eq(schema.contactOutbox.contactId, id),
    });
    if (outboxEntry) {
      throw new ConflictException('Không thể xóa yêu cầu liên hệ đã có lịch sử xử lý/thông báo.');
    }

    try {
      const [deleted] = await this.db
        .delete(schema.contacts)
        .where(eq(schema.contacts.id, id))
        .returning();
      if (!deleted) throw new NotFoundException(`Contact with id ${id} not found`);
      return { success: true, deleted };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const pgCode =
        (error as { code?: string })?.code ||
        (error as { cause?: { code?: string } })?.cause?.code;
      if (pgCode === '23503') {
        throw new ConflictException('Không thể xóa yêu cầu liên hệ đã có lịch sử xử lý/thông báo.');
      }
      throw error;
    }
  }
}
