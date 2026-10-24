import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContactsController } from '../src/modules/contacts/contacts.controller.js';
import { ContactsService } from '../src/modules/contacts/contacts.service.js';
import { RateLimitGuard } from '../src/modules/security/rate-limit.guard.js';
import { CaptchaGuard } from '../src/modules/security/captcha.guard.js';

describe('F13 Admin contact PATCH HTTP contract', () => {
  let app: INestApplication;
  const contactId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const assigneeId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const update = vi.fn(async (_id: string, data: unknown) => ({
    id: contactId,
    ...(data as object),
  }));

  beforeEach(async () => {
    update.mockClear();
    const module = await Test.createTestingModule({
      controllers: [ContactsController],
      providers: [{ provide: ContactsService, useValue: { update } }],
    })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(CaptchaGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it.each([
    '/api/contacts/' + contactId,
    '/api/contacts/' + contactId + '/status',
  ])('accepts only valid admin fields on %s', async (path) => {
    await request(app.getHttpServer())
      .patch(path)
      .send({
        status: 'processing',
        assignedTo: assigneeId,
        adminNote: 'Follow up',
      })
      .expect(200);
    expect(update).toHaveBeenCalledWith(contactId, {
      status: 'processing',
      assignedTo: assigneeId,
      adminNote: 'Follow up',
    });
  });

  it.each([
    ['id', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'],
    ['createdAt', '2000-01-01T00:00:00.000Z'],
    ['updatedAt', '2000-01-01T00:00:00.000Z'],
    ['email', 'forged@example.com'],
    ['fullName', 'Forged visitor'],
    ['unknownField', true],
  ])('rejects %s on both admin PATCH routes', async (field, value) => {
    for (const path of [
      `/api/contacts/${contactId}`,
      `/api/contacts/${contactId}/status`,
    ]) {
      await request(app.getHttpServer())
        .patch(path)
        .send({ status: 'processing', [field]: value })
        .expect(400);
    }
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects an invalid status and assignment instead of mutating records', async () => {
    await request(app.getHttpServer())
      .patch(`/api/contacts/${contactId}`)
      .send({ status: 'invalid' })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/api/contacts/${contactId}`)
      .send({ assignedTo: 'not-a-uuid' })
      .expect(400);
    expect(update).not.toHaveBeenCalled();
  });
});
