import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SettingsService } from './settings.service.js';
import { SettingsController } from './settings.controller.js';
import { EmailConfigService } from '../email/email.config.js';
import { EMAIL_SENDER } from '../email/email-sender.interface.js';
import { DRIZZLE } from '../../database/database.module.js';
import { IS_PUBLIC } from '../auth/public.decorator.js';
import {
  isEncryptedSecret,
  decryptSecret,
} from '../../common/encryption.util.js';

describe('SettingsService & SettingsController', () => {
  let service: SettingsService;
  let mockDb: any;
  let mockEmailConfig: any;
  let mockEmailSender: any;
  let failAtKey: string | null;

  // In-memory store for testing DB settings
  let store: Map<string, { key: string; value: string; isEncrypted: boolean }>;

  beforeEach(async () => {
    store = new Map();
    failAtKey = null;

    function matchesKey(where: any, key: string): boolean {
      if (!where) return false;
      if (where.right === key || where.right?.value === key) return true;
      if (where.value === key || where.value?.value === key) return true;
      if (Array.isArray(where.queryChunks)) {
        return where.queryChunks.some(
          (c: any) => c === key || c?.value === key || c?.value?.value === key,
        );
      }
      return false;
    }

    mockDb = {
      query: {
        systemSettings: {
          findFirst: vi.fn().mockImplementation((opts: any) => {
            for (const [k, v] of store.entries()) {
              if (matchesKey(opts?.where, k)) return v;
            }
            return null;
          }),
          findMany: vi.fn().mockImplementation(() => {
            return Array.from(store.values());
          }),
        },
      },
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((val) => {
          if (val.key === failAtKey)
            throw new Error('Simulated settings write failure');
          store.set(val.key, val);
          return Promise.resolve();
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockImplementation((val) => ({
          where: vi.fn().mockImplementation((whereClause) => {
            for (const [k, existing] of store.entries()) {
              if (matchesKey(whereClause, k)) {
                if (k === failAtKey)
                  throw new Error('Simulated settings write failure');
                store.set(k, { ...existing, ...val });
              }
            }
            return Promise.resolve();
          }),
        })),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation((whereClause) => {
          for (const k of Array.from(store.keys())) {
            if (matchesKey(whereClause, k)) {
              store.delete(k);
            }
          }
          return Promise.resolve();
        }),
      }),
    };
    mockDb.transaction = vi.fn(
      async (callback: (tx: any) => Promise<unknown>) => {
        const before = new Map(
          Array.from(store.entries(), ([key, row]) => [key, { ...row }]),
        );
        try {
          return await callback(mockDb);
        } catch (error) {
          store.clear();
          for (const [key, row] of before) store.set(key, row);
          throw error;
        }
      },
    );

    mockEmailConfig = {
      getEnvSmtpConfig: vi.fn().mockReturnValue({
        host: 'env-smtp.example.com',
        port: 587,
        secure: false,
        from: 'env-sender@example.com',
        to: 'env-recipient@example.com',
        auth: {
          user: 'env-user',
          pass: 'env-password',
        },
      }),
      getEffectiveSmtpConfig: vi.fn().mockImplementation(async () => {
        const pwRow = store.get('email.smtp_password');
        return {
          host: store.get('email.smtp_host')?.value || 'env-smtp.example.com',
          port: Number(store.get('email.smtp_port')?.value || 587),
          secure: store.get('email.smtp_secure')?.value === 'true',
          from: store.get('email.smtp_from')?.value || 'env-sender@example.com',
          to:
            store.get('email.notification_recipient')?.value ||
            'env-recipient@example.com',
          auth: {
            user: store.get('email.smtp_username')?.value || 'env-user',
            pass: pwRow ? 'decrypted-db-password' : 'env-password',
          },
        };
      }),
      invalidateCache: vi.fn(),
    };

    mockEmailSender = {
      send: vi.fn().mockResolvedValue({
        messageId: '<test-123@ltvietnam.com.vn>',
        accepted: ['test@example.com'],
        rejected: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        SettingsService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: EmailConfigService, useValue: mockEmailConfig },
        { provide: EMAIL_SENDER, useValue: mockEmailSender },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  describe('GET /api/settings/email (Secret Safety & Priority)', () => {
    it('should return env fallback when DB is empty and mask password', async () => {
      const res = await service.getEmailSettings();

      expect(res.notificationRecipient).toBe('env-recipient@example.com');
      expect(res.smtpFrom).toBe('env-sender@example.com');
      expect(res.smtpHost).toBe('env-smtp.example.com');
      expect(res.smtpPort).toBe(587);
      expect(res.smtpPasswordConfigured).toBe(true);

      // CRITICAL: plaintext password, ciphertext, and keys MUST NOT be returned
      expect((res as any).smtpPassword).toBeUndefined();
      expect((res as any).encryptedPassword).toBeUndefined();
      expect((res as any).iv).toBeUndefined();
      expect((res as any).tag).toBeUndefined();
    });

    it('should prioritize DB settings over env fallback', async () => {
      store.set('email.notification_recipient', {
        key: 'email.notification_recipient',
        value: 'db-recipient@ltvietnam.com.vn',
        isEncrypted: false,
      });
      store.set('email.smtp_host', {
        key: 'email.smtp_host',
        value: 'db-smtp.ltvietnam.com.vn',
        isEncrypted: false,
      });

      const res = await service.getEmailSettings();
      expect(res.notificationRecipient).toBe('db-recipient@ltvietnam.com.vn');
      expect(res.smtpHost).toBe('db-smtp.ltvietnam.com.vn');
      // smtpFrom fell back to env because not set in DB
      expect(res.smtpFrom).toBe('env-sender@example.com');
    });
  });

  describe('PUT /api/settings/email (Password Update Semantics & Encryption)', () => {
    it('rolls back every setting and preserves the cache when a middle write fails', async () => {
      const oldSettings = new Map([
        ['email.notification_recipient', 'old@example.com'],
        ['email.smtp_from', 'old-sender@example.com'],
        ['email.smtp_host', 'old.smtp.example.com'],
        ['email.smtp_port', '465'],
        ['email.smtp_secure', 'true'],
        ['email.smtp_username', 'old-user'],
        ['email.smtp_password', 'v1:old-encrypted-secret'],
      ]);
      for (const [key, value] of oldSettings) {
        store.set(key, { key, value, isEncrypted: key.endsWith('password') });
      }
      const before = Array.from(store.entries()).map(([key, row]) => [
        key,
        { ...row },
      ]);
      failAtKey = 'email.smtp_port';

      await expect(
        service.updateEmailSettings({
          notificationRecipient: 'new@example.com',
          smtpFrom: 'new-sender@example.com',
          smtpHost: 'new.smtp.example.com',
          smtpPort: 587,
          smtpSecure: false,
          smtpUsername: 'new-user',
          smtpPassword: 'new-secret',
        }),
      ).rejects.toThrow('Simulated settings write failure');

      expect(Array.from(store.entries())).toEqual(before);
      expect(mockEmailConfig.invalidateCache).not.toHaveBeenCalled();
    });

    it('should encrypt new password using AES-256-GCM and store it', async () => {
      const newSecret = 'my-new-smtp-password-999';

      await service.updateEmailSettings({
        notificationRecipient: 'admin@ltvietnam.com.vn',
        smtpFrom: 'no-reply@ltvietnam.com.vn',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 465,
        smtpSecure: true,
        smtpUsername: 'ltvn-mailer',
        smtpPassword: newSecret,
      });

      expect(mockDb.transaction).toHaveBeenCalledOnce();
      expect(mockEmailConfig.invalidateCache).toHaveBeenCalled();
      const storedRow = store.get('email.smtp_password');
      expect(storedRow).toBeDefined();
      expect(storedRow?.isEncrypted).toBe(true);
      expect(storedRow?.value).not.toBe(newSecret);
      expect(isEncryptedSecret(storedRow!.value)).toBe(true);

      // Decrypt to verify exact match
      const decrypted = decryptSecret(storedRow!.value);
      expect(decrypted).toBe(newSecret);
    });

    it('should preserve existing secret when password is empty string or omitted', async () => {
      // First, set an existing encrypted password
      store.set('email.smtp_password', {
        key: 'email.smtp_password',
        value: 'v1:original-encrypted-hash',
        isEncrypted: true,
      });

      // Update settings with blank password
      await service.updateEmailSettings({
        notificationRecipient: 'admin@ltvietnam.com.vn',
        smtpFrom: 'no-reply@ltvietnam.com.vn',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpSecure: false,
        smtpUsername: 'ltvn-mailer',
        smtpPassword: '', // blank: preserve!
      });

      const storedRow = store.get('email.smtp_password');
      expect(storedRow?.value).toBe('v1:original-encrypted-hash');
    });

    it('should remove secret only when clearSmtpPassword is explicitly true', async () => {
      store.set('email.smtp_password', {
        key: 'email.smtp_password',
        value: 'v1:existing-hash',
        isEncrypted: true,
      });

      await service.updateEmailSettings({
        notificationRecipient: 'admin@ltvietnam.com.vn',
        smtpFrom: 'no-reply@ltvietnam.com.vn',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpSecure: false,
        clearSmtpPassword: true,
      });

      expect(store.has('email.smtp_password')).toBe(false);
    });
  });

  describe('POST /api/settings/email/test (Diagnostic Action & Error Sanitization)', () => {
    it('should send test email to configured notificationRecipient', async () => {
      store.set('email.notification_recipient', {
        key: 'email.notification_recipient',
        value: 'test-recipient@ltvietnam.com.vn',
        isEncrypted: false,
      });

      const res = await service.sendTestEmail('admin@ltvietnam.com.vn');

      expect(res.success).toBe(true);
      expect(res.recipient).toBe('test-recipient@ltvietnam.com.vn');
      expect(mockEmailSender.send).toHaveBeenCalledTimes(1);
      const callArg = mockEmailSender.send.mock.calls[0][0];
      expect(callArg.to).toBe('test-recipient@ltvietnam.com.vn');
      expect(callArg.subject).toContain('[LTVN Test]');
    });

    it('does not expose arbitrary SMTP provider details in the API exception or log', async () => {
      const logSpy = vi
        .spyOn((service as any).logger, 'error')
        .mockImplementation(() => {});
      mockEmailSender.send.mockRejectedValueOnce(
        Object.assign(
          new Error(
            'secret_password_raw smtp-user internal.smtp.local 10.8.0.4',
          ),
          { code: 'EAUTH', responseCode: 535 },
        ),
      );

      const error = await service
        .sendTestEmail('admin@ltvietnam.com.vn')
        .catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(BadRequestException);
      if (!(error instanceof BadRequestException)) throw error;
      expect(JSON.stringify(error.getResponse())).not.toMatch(
        /secret_password_raw|smtp-user|internal\.smtp\.local|10\.8\.0\.4/,
      );
      expect(JSON.stringify(logSpy.mock.calls)).not.toMatch(
        /secret_password_raw|smtp-user|internal\.smtp\.local|10\.8\.0\.4/,
      );
    });
  });

  describe('SettingsController Protection', () => {
    it('should NOT have IS_PUBLIC decorator on controller or handlers (strictly protected by global AuthGuard)', () => {
      const isPublicClass = Reflect.getMetadata(IS_PUBLIC, SettingsController);
      expect(isPublicClass).toBeFalsy();

      const handlers = [
        'getEmailSettings',
        'updateEmailSettings',
        'sendTestEmail',
      ];
      for (const handler of handlers) {
        const isPublicHandler = Reflect.getMetadata(
          IS_PUBLIC,
          (SettingsController.prototype as any)[handler],
        );
        expect(isPublicHandler).toBeFalsy();
      }
    });
  });
});
