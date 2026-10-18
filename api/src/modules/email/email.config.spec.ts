import { describe, expect, it, vi } from 'vitest';
import { EmailConfigService } from './email.config.js';
import type { DrizzleDb } from '../../database/database.module.js';
import type { ConfigService } from '@nestjs/config';

describe('F14 email worker configuration snapshot', () => {
  it('resolves each effective SMTP configuration from a single settings query', async () => {
    const rows = (suffix: string) => [
      { key: 'email.smtp_host', value: `${suffix}.smtp.example.com`, isEncrypted: false },
      { key: 'email.smtp_from', value: `${suffix}@example.com`, isEncrypted: false },
      { key: 'email.notification_recipient', value: `${suffix}-recipient@example.com`, isEncrypted: false },
    ];
    const findMany = vi.fn()
      .mockResolvedValueOnce(rows('old'))
      .mockResolvedValueOnce(rows('new'));
    const db = { query: { systemSettings: { findMany } } } as unknown as DrizzleDb;
    const env = { get: vi.fn(() => undefined) } as unknown as ConfigService;
    const service = new EmailConfigService(env, db);

    const beforeCommit = await service.getEffectiveSmtpConfig();
    expect(beforeCommit).toMatchObject({
      host: 'old.smtp.example.com',
      from: 'old@example.com',
      to: 'old-recipient@example.com',
    });
    expect(findMany).toHaveBeenCalledTimes(1);

    service.invalidateCache();
    const afterCommit = await service.getEffectiveSmtpConfig();
    expect(afterCommit).toMatchObject({
      host: 'new.smtp.example.com',
      from: 'new@example.com',
      to: 'new-recipient@example.com',
    });
    expect(findMany).toHaveBeenCalledTimes(2);
  });
});
