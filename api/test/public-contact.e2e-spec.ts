import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { DRIZZLE } from '../src/database/database.module.js';
import * as schema from '../src/database/schema.js';
import { ContactsService } from '../src/modules/contacts/contacts.service.js';
import { PublicContactDto } from '../src/modules/contacts/dto/public-contact.dto.js';

const valid = {
  fullName: 'Nguyễn Văn An',
  companyName: 'Công ty Kiểm định Việt Nam',
  email: 'visitor+qa@example.com',
  phone: '+84 (0) 912 345 678',
  requestType: 'product_consultation',
  message: 'Tôi cần tư vấn thiết bị phân tích.',
} satisfies PublicContactDto;
const serverFields = { status: 'new', assignedTo: null, adminNote: null, resolvedAt: null };
const expectedInsert = {
  fullName: valid.fullName, companyName: valid.companyName, email: valid.email,
  phone: valid.phone, subject: 'Tư vấn lựa chọn sản phẩm', message: valid.message, ...serverFields,
};

describe('QA-08: Public Contact DTO and server-owned insert fields', () => {
  let app: INestApplication<App>;
  let service: ContactsService;
  let createSpy: ReturnType<typeof vi.spyOn<ContactsService, 'create'>>;
  const values = vi.fn((data: schema.NewContact | schema.NewContactOutbox) => ({
    returning: () => Promise.resolve([{
      id: randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...data,
    }]),
  }));
  const insert = vi.fn((_table: unknown) => ({ values }));
  const transaction = vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb({ insert }));

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService).useValue(new ConfigService({
        JWT_SECRET: randomBytes(48).toString('base64url'), JWT_TTL_SECONDS: '3600',
      }))
      .overrideProvider(DRIZZLE).useValue({ insert, transaction })
      .compile();
    service = module.get(ContactsService);
    createSpy = vi.spyOn(service, 'create');
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  beforeEach(() => {
    createSpy.mockClear();
    insert.mockClear();
    values.mockClear();
    transaction.mockClear();
  });

  afterAll(async () => { await app.close(); });

  it('accepts valid visitor input without a token and calls the real create service', async () => {
    const response = await request(app.getHttpServer()).post('/api/contacts').send(valid).expect(202);
    expect(createSpy).toHaveBeenCalledOnce();
    expect(createSpy.mock.calls[0][0]).toBeInstanceOf(PublicContactDto);
    expect(createSpy.mock.calls[0][0]).toEqual(valid);
    expect(insert).toHaveBeenCalledWith(schema.contacts);
    expect(insert).toHaveBeenCalledWith(schema.contactOutbox);
    expect(values).toHaveBeenCalledWith(expectedInsert);
    expect(response.body).toEqual({
      message: 'Yêu cầu của bạn đã được tiếp nhận.',
      id: expect.any(String),
    });
    expect(response.body).not.toHaveProperty('requestType');
    expect(response.body).not.toHaveProperty('status');
    expect(response.body).not.toHaveProperty('contactOutbox');
  });

  it('trims all visitor strings before they reach the service and insert', async () => {
    const padded = Object.fromEntries(Object.entries(valid).map(([key, value]) => [key, `  ${value} \t`]));
    await request(app.getHttpServer()).post('/api/contacts').send(padded).expect(202);
    expect(createSpy.mock.calls[0][0]).toEqual(valid);
    expect(values).toHaveBeenCalledWith(expectedInsert);
  });

  it('rejects the legacy three-field payload now that all six v1 fields are required', async () => {
    const minimal = { fullName: valid.fullName, email: valid.email, message: valid.message };
    await request(app.getHttpServer()).post('/api/contacts').send(minimal).expect(400);
    expect(createSpy).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it.each([
    ['quotation', 'Yêu cầu báo giá'],
    ['product_consultation', 'Tư vấn lựa chọn sản phẩm'],
    ['technical_support', 'Hỗ trợ kỹ thuật'],
    ['maintenance_repair', 'Bảo trì hoặc sửa chữa'],
    ['partnership', 'Hợp tác'],
    ['other', 'Liên hệ khác'],
  ])('maps requestType %s to the existing subject column', async (requestType, subject) => {
    await request(app.getHttpServer()).post('/api/contacts').send({ ...valid, requestType }).expect(202);
    expect(values).toHaveBeenCalledWith({ ...expectedInsert, subject });
    expect(createSpy.mock.calls[0][0].requestType).toBe(requestType);
  });

  it.each([
    '0912345678', '024 6650 6373', '(024) 6650 6373', '+84 912 345 678',
    '+1 (415) 555-2671', '+44 20 7946 0958', '0084.912.345.678', '+123456789012345',
  ])('accepts common domestic/international phone formatting: %s', async (phone) => {
    await request(app.getHttpServer()).post('/api/contacts').send({ ...valid, phone }).expect(202);
    expect(values.mock.calls[0][0].phone).toBe(phone);
  });

  const invalidFields = [
    { fullName: '   ' }, { message: '\n\t ' }, { email: 'not-an-email' }, { email: 'user@' },
    { email: '   ' }, { email: null }, { phone: 'abc' }, { phone: '123' },
    { phone: '1234567890123456' }, { phone: '++84 912345678' }, { phone: ' ' }, { phone: null },
    { fullName: 42 }, { message: ['hello'] }, { email: 42 }, { phone: 123456789 },
    { fullName: 'N'.repeat(256) }, { message: 'M'.repeat(5001) },
    { email: `${'a'.repeat(245)}@example.com` }, { phone: `1${' '.repeat(44)}2345678` },
    { companyName: ' ' }, { companyName: null }, { companyName: {} }, { companyName: 'C'.repeat(256) },
    { requestType: 'unlisted' }, { requestType: '' }, { requestType: ' ' }, { requestType: null },
    { requestType: {} }, { requestType: 'Yêu cầu báo giá' }, { requestType: 'QUOTATION' },
  ];
  it.each(invalidFields)('rejects invalid or oversized fields before calling create: %j', async (fields) => {
    await request(app.getHttpServer()).post('/api/contacts').send({ ...valid, ...fields }).expect(400);
    expect(createSpy).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it.each(['fullName', 'companyName', 'phone', 'email', 'requestType', 'message'])('requires %s instead of generating a placeholder', async (field) => {
    const body: Record<string, unknown> = { ...valid };
    delete body[field];
    await request(app.getHttpServer()).post('/api/contacts').send(body).expect(400);
    expect(createSpy).not.toHaveBeenCalled();
  });

  const forbiddenFields = [
    { status: 'resolved' }, { id: randomUUID() }, { assignedTo: randomUUID() },
    { assignedUser: { id: randomUUID() } }, { adminNote: 'Visitor tries to write an admin note' },
    { resolvedAt: new Date().toISOString() }, { createdAt: new Date().toISOString() },
    { updatedAt: new Date().toISOString() }, { subject: 'Free-form public subject is not allowed' },
    { company: 'Wrong property; the contract uses companyName' },
    { unexpected: 'unknown property' },
  ];
  it.each(forbiddenFields)('rejects non-whitelisted input: %j', async (fields) => {
    await request(app.getHttpServer()).post('/api/contacts').send({ ...valid, ...fields }).expect(400);
    expect(createSpy).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it.each([{}, [], [valid]])('rejects a malformed/missing DTO: %j', async (body) => {
    await request(app.getHttpServer()).post('/api/contacts').send(body).expect(400);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('maps only visitor fields even if an internal caller passes extra properties', async () => {
    const tampered = {
      ...valid, id: randomUUID(), status: 'resolved', assignedTo: randomUUID(),
      assignedUser: { id: randomUUID() }, adminNote: 'Injected note',
      resolvedAt: new Date(), createdAt: new Date(), updatedAt: new Date(), subject: 'Injected subject',
    };
    await service.create(tampered);
    expect(values).toHaveBeenCalledWith(expectedInsert);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'contact.notification.requested',
        status: 'pending',
        attemptCount: 0,
      }),
    );
  });

  const contactId = randomUUID();
  const protectedRoutes = [
    ['get', '/api/contacts'], ['get', `/api/contacts/${contactId}`],
    ['patch', `/api/contacts/${contactId}`], ['patch', `/api/contacts/${contactId}/status`],
    ['delete', `/api/contacts/${contactId}`],
  ] as const;
  it.each(protectedRoutes)('still rejects anonymous Admin %s %s', async (method, path) => {
    await request(app.getHttpServer())[method](path).expect(401);
    expect(insert).not.toHaveBeenCalled();
  });
});
