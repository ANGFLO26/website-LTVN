import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsController } from '../src/modules/settings/settings.controller.js';
import { SettingsService } from '../src/modules/settings/settings.service.js';
import { EmailConfigService } from '../src/modules/email/email.config.js';
import { EMAIL_SENDER } from '../src/modules/email/email-sender.interface.js';
import { DRIZZLE } from '../src/database/database.module.js';

describe('F04/F14 settings HTTP contract with fake SMTP and transactional DB', () => {
  let app: INestApplication;
  let store: Map<string, { key: string; value: string; isEncrypted: boolean }>;
  let failAtKey: string | null;
  const invalidateCache = vi.fn();
  const send = vi.fn();

  const keyFromCondition = (condition: any): string => {
    const chunk = condition?.queryChunks?.find(
      (value: unknown) => typeof value === 'string',
    );
    return chunk || '';
  };

  const makeTx = (rows: typeof store) => ({
    query: {
      systemSettings: {
        findFirst: vi.fn(
          async ({ where }: any) => rows.get(keyFromCondition(where)) ?? null,
        ),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(async (row: any) => {
        if (row.key === failAtKey)
          throw new Error('Simulated settings write failure');
        rows.set(row.key, row);
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn((patch: any) => ({
        where: vi.fn(async (where: any) => {
          const key = keyFromCondition(where);
          if (key === failAtKey)
            throw new Error('Simulated settings write failure');
          rows.set(key, { ...rows.get(key)!, ...patch });
        }),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(async (where: any) => {
        rows.delete(keyFromCondition(where));
      }),
    })),
  });

  beforeEach(async () => {
    store = new Map([
      [
        'email.notification_recipient',
        {
          key: 'email.notification_recipient',
          value: 'old@example.com',
          isEncrypted: false,
        },
      ],
      [
        'email.smtp_host',
        {
          key: 'email.smtp_host',
          value: 'old.smtp.example.com',
          isEncrypted: false,
        },
      ],
    ]);
    failAtKey = null;
    invalidateCache.mockClear();
    send.mockReset();
    const db = {
      query: {
        systemSettings: {
          findMany: vi.fn(async () => Array.from(store.values())),
        },
      },
      transaction: vi.fn(async (callback: (tx: any) => Promise<unknown>) => {
        const pending = new Map(
          Array.from(store.entries(), ([key, row]) => [key, { ...row }]),
        );
        const result = await callback(makeTx(pending));
        store = pending;
        return result;
      }),
    };
    const emailConfig = {
      getEnvSmtpConfig: vi.fn(() => null),
      getEffectiveSmtpConfig: vi.fn(async () => ({
        host: 'internal.smtp.local',
        port: 587,
        secure: false,
        from: 'sender@example.com',
        to: 'recipient@example.com',
        auth: { user: 'smtp-username', pass: 'FAKE_SECRET' },
      })),
      invalidateCache,
    };
    const module = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        SettingsService,
        { provide: DRIZZLE, useValue: db },
        { provide: EmailConfigService, useValue: emailConfig },
        { provide: EMAIL_SENDER, useValue: { send } },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('does not return provider error details from the test-email endpoint', async () => {
    send.mockRejectedValueOnce(
      Object.assign(
        new Error('FAKE_SECRET smtp-username internal.smtp.local 10.8.0.4'),
        { code: 'EAUTH', responseCode: 535 },
      ),
    );
    const response = await request(app.getHttpServer())
      .post('/api/settings/email/test')
      .expect(400);
    expect(JSON.stringify(response.body)).not.toMatch(
      /FAKE_SECRET|smtp-username|internal\.smtp\.local|10\.8\.0\.4/,
    );
    expect(response.body.message).toMatch(/Không thể gửi email kiểm tra/);
  });

  it('keeps previous settings and cache when a middle write fails', async () => {
    const before = Array.from(store.entries());
    failAtKey = 'email.smtp_port';
    await request(app.getHttpServer())
      .put('/api/settings/email')
      .send({
        notificationRecipient: 'new@example.com',
        smtpFrom: 'sender@example.com',
        smtpHost: 'new.smtp.example.com',
        smtpPort: 587,
        smtpSecure: false,
        smtpUsername: 'new-user',
        smtpPassword: 'FAKE_NEW_SECRET',
      })
      .expect(500);
    expect(Array.from(store.entries())).toEqual(before);
    expect(invalidateCache).not.toHaveBeenCalled();
  });
});
