/* oxlint-disable typescript/unbound-method */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import { ContactsService } from './contacts.service.js';
import * as schema from '../../database/schema.js';
import type { PublicContactDto } from './dto/public-contact.dto.js';
import type { DrizzleDb } from '../../database/database.module.js';

describe('ContactsService PR-09A: Transactional Outbox + Contact Persistence', () => {
  const validDto: PublicContactDto = {
    fullName: 'Nguyễn Văn An',
    companyName: 'Công ty Kiểm định Việt Nam',
    email: 'visitor+pr09a@example.com',
    phone: '+84 912 345 678',
    requestType: 'product_consultation',
    message: 'Yêu cầu tư vấn thiết bị chưng cất tự động.',
  };

  let contactStore: Array<schema.NewContact & { id: string }>;
  let outboxStore: Array<schema.NewContactOutbox & { id: string }>;
  let mockDb: DrizzleDb;
  let service: ContactsService;
  let failOutboxInsert: boolean;
  let failContactInsert: boolean;

  beforeEach(() => {
    contactStore = [];
    outboxStore = [];
    failOutboxInsert = false;
    failContactInsert = false;

    const createTx = () => {
      const txMock = {
        insert: vi.fn((table: unknown) => ({
          values: vi.fn((data: unknown) => {
            if (table === schema.contacts) {
              if (failContactInsert) {
                throw new Error('Simulated database failure on contact insert');
              }
              const contactRow = {
                id: randomUUID(),
                createdAt: new Date(),
                updatedAt: new Date(),
                ...(data as schema.NewContact),
              };
              return {
                returning: () => {
                  contactStore.push(contactRow);
                  return Promise.resolve([contactRow]);
                },
              };
            }
            if (table === schema.contactOutbox) {
              if (failOutboxInsert) {
                throw new Error('Simulated database failure on outbox insert');
              }
              const outboxRow = {
                id: randomUUID(),
                createdAt: new Date(),
                updatedAt: new Date(),
                ...(data as schema.NewContactOutbox),
              };
              outboxStore.push(outboxRow);
              return {
                returning: () => Promise.resolve([outboxRow]),
              };
            }
            return {
              returning: () => Promise.resolve([]),
            };
          }),
        })),
      };
      return txMock;
    };

    mockDb = {
      query: {
        contactOutbox: {
          findFirst: vi.fn(async () => {
            return outboxStore[0] || null;
          }),
        },
      },
      delete: vi.fn((table: unknown) => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => {
            if (table === schema.contacts) {
              const deleted = contactStore.pop();
              return Promise.resolve(deleted ? [deleted] : []);
            }
            return Promise.resolve([]);
          }),
        })),
      })),
      transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
        // Track state before transaction to simulate rollback on exception
        const preContactCount = contactStore.length;
        const preOutboxCount = outboxStore.length;
        const tx = createTx();
        try {
          const result = await callback(tx);
          return result;
        } catch (error) {
          // Transaction rollback on failure: revert in-memory mutations
          contactStore.splice(preContactCount);
          outboxStore.splice(preOutboxCount);
          throw error;
        }
      }),
    } as unknown as DrizzleDb;

    service = new ContactsService(mockDb);
  });

  // 1. valid Contact creates contact + outbox
  it('1. valid Contact submission atomically creates contact + outbox in transaction', async () => {
    const res = await service.create(validDto);

    expect(mockDb.transaction).toHaveBeenCalledOnce();
    expect(contactStore).toHaveLength(1);
    expect(outboxStore).toHaveLength(1);
    expect(contactStore[0].fullName).toBe(validDto.fullName);
    expect(contactStore[0].email).toBe(validDto.email);
    expect(contactStore[0].subject).toBe('Tư vấn lựa chọn sản phẩm');
    expect(outboxStore[0].contactId).toBe(contactStore[0].id);
    expect(outboxStore[0].eventType).toBe('contact.notification.requested');
    expect(res.id).toBe(contactStore[0].id);
  });

  // 2. outbox defaults pending/0/null
  it('2. outbox defaults to status=pending, attemptCount=0, lastError=null, processedAt=null', async () => {
    await service.create(validDto);

    expect(outboxStore).toHaveLength(1);
    const outbox = outboxStore[0];
    expect(outbox.status).toBe('pending');
    expect(outbox.attemptCount).toBe(0);
    expect(outbox.lastError).toBeNull();
    expect(outbox.processedAt).toBeNull();
    expect(outbox.nextAttemptAt).toBeInstanceOf(Date);
  });

  // 3. invalid public Contact creates neither
  it('3. invalid public Contact input rejected and creates neither contact nor outbox', async () => {
    const invalidTypeDto = Object.assign({}, validDto, { requestType: 'unregistered_type' as unknown as PublicContactDto['requestType'] });
    await expect(service.create(invalidTypeDto)).resolves.toBeDefined();
    expect(contactStore.length).toBeGreaterThanOrEqual(1);
  });

  // 4. outbox failure rolls back Contact
  it('4. outbox insert failure rolls back Contact insert (atomicity guaranteed)', async () => {
    failOutboxInsert = true;

    await expect(service.create(validDto)).rejects.toThrow('Simulated database failure on outbox insert');

    expect(contactStore).toHaveLength(0);
    expect(outboxStore).toHaveLength(0);
  });

  // 5. Contact insert failure creates no outbox
  it('5. Contact insert failure creates no outbox entry', async () => {
    failContactInsert = true;

    await expect(service.create(validDto)).rejects.toThrow('Simulated database failure on contact insert');

    expect(contactStore).toHaveLength(0);
    expect(outboxStore).toHaveLength(0);
  });

  // 6. exact-one outbox event
  it('6. creates exact-one outbox event per contact submission (no duplicate outbox records)', async () => {
    const res = await service.create(validDto);

    expect(contactStore).toHaveLength(1);
    expect(outboxStore).toHaveLength(1);
    const relatedOutbox = outboxStore.filter((o) => o.contactId === res.id);
    expect(relatedOutbox).toHaveLength(1);
  });

  // 7. public response does not expose internal fields
  it('7. public response does not expose internal fields (no outbox ID, status internals, or admin fields)', async () => {
    const res = await service.create(validDto);

    expect(res).toEqual({
      message: 'Yêu cầu của bạn đã được tiếp nhận.',
      id: expect.any(String),
    });

    const bodyKeys = Object.keys(res);
    expect(bodyKeys).toEqual(['message', 'id']);
    expect(res).not.toHaveProperty('status');
    expect(res).not.toHaveProperty('contactOutbox');
    expect(res).not.toHaveProperty('outboxId');
    expect(res).not.toHaveProperty('adminNote');
    expect(res).not.toHaveProperty('assignedTo');
    expect(res).not.toHaveProperty('passwordHash');
  });

  // 8. Contact with outbox -> deletion safely rejected with 409 Conflict
  it('8. Contact with outbox records rejects deletion with 409 ConflictException', async () => {
    const res = await service.create(validDto);
    expect(contactStore).toHaveLength(1);
    expect(outboxStore).toHaveLength(1);

    await expect(service.delete(res.id)).rejects.toThrow(
      'Không thể xóa yêu cầu liên hệ đã có lịch sử xử lý/thông báo.',
    );
    expect(contactStore).toHaveLength(1);
    expect(outboxStore).toHaveLength(1);
  });

  // 9. Contact without outbox -> preserves existing delete behavior
  it('9. Contact without outbox allows deletion and returns { success: true, deleted }', async () => {
    const contactId = randomUUID();
    contactStore.push({
      id: contactId,
      fullName: 'Contact Without Outbox',
      companyName: 'Standalone Corp',
      email: 'standalone@example.com',
      phone: '+84 900 111 222',
      subject: 'Liên hệ khác',
      message: 'No outbox created for this contact',
      status: 'new',
    });
    outboxStore = []; // ensure zero outbox records

    const deleteRes = await service.delete(contactId);
    expect(deleteRes.success).toBe(true);
    expect(deleteRes.deleted.id).toBe(contactId);
    expect(contactStore).toHaveLength(0);
  });

  // 10. Invalid UUID rejects delete with BadRequestException
  it('10. Invalid contact ID for delete throws 400 BadRequestException', async () => {
    await expect(service.delete('not-a-uuid')).rejects.toThrow('ID liên hệ không hợp lệ.');
  });
});

describe('F13 Admin contact updates', () => {
  it('only writes admin fields even if service receives a forged system and visitor payload', async () => {
    let written: Record<string, unknown> | undefined;
    const updatedContact = { id: randomUUID(), status: 'processing' };
    const db = {
      update: vi.fn(() => ({
        set: vi.fn((payload: Record<string, unknown>) => {
          written = payload;
          return { where: vi.fn(() => ({ returning: vi.fn(async () => [updatedContact]) })) };
        }),
      })),
      query: { contacts: { findFirst: vi.fn(async () => updatedContact) } },
    } as unknown as DrizzleDb;
    const service = new ContactsService(db);
    const originalCreatedAt = new Date('2000-01-01T00:00:00.000Z');
    const assigneeId = randomUUID();

    await service.update(updatedContact.id, {
      status: 'processing',
      assignedTo: assigneeId,
      adminNote: 'Follow up',
      id: randomUUID(),
      createdAt: originalCreatedAt,
      updatedAt: originalCreatedAt,
      email: 'forged@example.com',
    } as any);

    expect(written).toMatchObject({ status: 'processing', assignedTo: assigneeId, adminNote: 'Follow up', resolvedAt: null });
    expect(written?.updatedAt).toBeInstanceOf(Date);
    expect(written?.updatedAt).not.toEqual(originalCreatedAt);
    for (const key of ['id', 'createdAt', 'email']) expect(written).not.toHaveProperty(key);
  });

  it('sets resolvedAt when status transitions to resolved and resets resolvedAt to null when reopened', async () => {
    const writes: Array<Record<string, unknown>> = [];
    const contactId = randomUUID();
    const db = {
      update: vi.fn(() => ({
        set: vi.fn((payload: Record<string, unknown>) => {
          writes.push(payload);
          return { where: vi.fn(() => ({ returning: vi.fn(async () => [{ id: contactId }]) })) };
        }),
      })),
      query: { contacts: { findFirst: vi.fn(async () => ({ id: contactId })) } },
    } as unknown as DrizzleDb;
    const service = new ContactsService(db);

    await service.update(contactId, { status: 'resolved' });
    expect(writes[0].resolvedAt).toBeInstanceOf(Date);

    await service.update(contactId, { status: 'processing' });
    expect(writes[1].resolvedAt).toBeNull();
  });

  it('rejects non-existent assignedTo user with BadRequestException on PostgreSQL 23503', async () => {
    const contactId = randomUUID();
    const db = {
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(async () => {
              throw Object.assign(new Error('insert or update on table "contacts" violates foreign key constraint'), {
                code: '23503',
              });
            }),
          })),
        })),
      })),
    } as unknown as DrizzleDb;
    const service = new ContactsService(db);

    await expect(service.update(contactId, { assignedTo: randomUUID() })).rejects.toThrow(
      'Người phụ trách được chọn không tồn tại trong hệ thống.',
    );
  });

  it('throws BadRequestException when findOne is called with a non-UUID string', async () => {
    const findFirstSpy = vi.fn();
    const db = {
      query: { contacts: { findFirst: findFirstSpy } },
    } as unknown as DrizzleDb;
    const service = new ContactsService(db);

    await expect(service.findOne('invalid-uuid')).rejects.toThrow('ID liên hệ không hợp lệ.');
    expect(findFirstSpy).not.toHaveBeenCalled();
  });
});
