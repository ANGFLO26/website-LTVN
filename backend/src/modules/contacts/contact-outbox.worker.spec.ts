/* oxlint-disable typescript/unbound-method */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  ContactOutboxWorker,
  calculateBackoff,
  sanitizeError,
} from './contact-outbox.worker.js';
import {
  buildContactNotificationEmail,
  escapeHtml,
} from '../email/templates/contact-notification.template.js';
import type { EmailConfigService, WorkerConfig, SmtpConfig } from '../email/email.config.js';
import type { IEmailSender } from '../email/email-sender.interface.js';
import * as schema from '../../database/schema.js';
import type { DrizzleDb } from '../../database/database.module.js';

describe('ContactOutboxWorker & SMTP Notification Unit Tests (PR-09B)', () => {
  let workerConfig: WorkerConfig;
  let smtpConfig: SmtpConfig | null;
  let mockEmailConfig: EmailConfigService;
  let mockEmailSender: IEmailSender;
  let mockDb: unknown;
  let outboxStore: schema.ContactOutbox[];
  let contactStore: schema.Contact[];

  beforeEach(() => {
    workerConfig = {
      maxAttempts: 5,
      retryBaseSeconds: 10,
      pollIntervalMs: 5000,
      processingLeaseSeconds: 300,
      enabled: true,
    };

    smtpConfig = {
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: { user: 'smtp_user', pass: 'smtp_pass' },
      from: 'no-reply@ltvietnam.com.vn',
      to: 'contact@ltvietnam.com.vn',
    };

    outboxStore = [];
    contactStore = [];

    mockEmailConfig = {
      getWorkerConfig: vi.fn(() => workerConfig),
      getSmtpConfig: vi.fn(() => smtpConfig),
      getEffectiveSmtpConfig: vi.fn(async () => smtpConfig),
      isSmtpConfigured: vi.fn(() => Boolean(smtpConfig && smtpConfig.host)),
    } as unknown as EmailConfigService;

    mockEmailSender = {
      send: vi.fn(async () => ({ messageId: `<mock-${randomUUID()}@example.com>` })),
    };

    mockDb = {
      query: {
        contacts: {
          findFirst: vi.fn(async () => {
            return contactStore[0] || null;
          }),
        },
      },
      update: vi.fn((_table: unknown) => ({
        set: vi.fn((patch: Partial<schema.ContactOutbox>) => ({
          where: vi.fn(async () => {
            if (outboxStore.length > 0) {
              Object.assign(outboxStore[0], patch);
            }
            return [outboxStore[0]];
          }),
        })),
      })),
      execute: vi.fn(async () => {
        // Simulates atomic claim with lease recovery
        const now = Date.now();
        const candidate = outboxStore.find((item) => {
          if (item.eventType !== 'contact.notification.requested') return false;
          if (item.status === 'pending' && new Date(item.nextAttemptAt).getTime() <= now) {
            return true;
          }
          if (item.status === 'processing') {
            const staleThreshold = now - workerConfig.processingLeaseSeconds * 1000;
            return new Date(item.updatedAt).getTime() < staleThreshold;
          }
          return false;
        });

        if (candidate) {
          candidate.status = 'processing';
          candidate.updatedAt = new Date();
          return [
            {
              id: candidate.id,
              contact_id: candidate.contactId,
              event_type: candidate.eventType,
              status: candidate.status,
              attempt_count: candidate.attemptCount,
              next_attempt_at: candidate.nextAttemptAt,
              last_error: candidate.lastError,
              processed_at: candidate.processedAt,
              created_at: candidate.createdAt,
              updated_at: candidate.updatedAt,
            },
          ];
        }
        return [];
      }),
    };
  });

  const createSampleContact = (): schema.Contact => ({
    id: randomUUID(),
    fullName: 'Nguyễn Văn Kiểm',
    companyName: 'Công ty PAC Test',
    email: 'van.kiem@example.com',
    phone: '+84 912 345 678',
    subject: 'Tư vấn lựa chọn sản phẩm',
    message: 'Cần tư vấn thiết bị đo nhiệt độ đông đặc PAC.',
    status: 'new',
    assignedTo: null,
    adminNote: 'Admin private note',
    resolvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const createSampleOutbox = (
    contactId: string,
    status: schema.ContactOutbox['status'] = 'pending',
    attemptCount = 0,
    nextAttemptAt = new Date(Date.now() - 1000),
  ): schema.ContactOutbox => ({
    id: randomUUID(),
    contactId,
    eventType: 'contact.notification.requested',
    status,
    attemptCount,
    nextAttemptAt,
    lastError: null,
    processedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 1. claim pending
  it('1. claims pending event when nextAttemptAt <= now', async () => {
    const contact = createSampleContact();
    contactStore.push(contact);
    const outbox = createSampleOutbox(contact.id, 'pending', 0, new Date(Date.now() - 1000));
    outboxStore.push(outbox);

    const worker = new ContactOutboxWorker(
      mockDb as DrizzleDb,
      mockEmailSender,
      mockEmailConfig,
    );

    const claimed = await worker.claimPendingEvents(1);
    expect(claimed).toHaveLength(1);
    expect(claimed[0].id).toBe(outbox.id);
    expect(claimed[0].status).toBe('processing');
  });

  // 2. ignore sent
  it('2. ignores outbox events already marked as sent', async () => {
    const contact = createSampleContact();
    contactStore.push(contact);
    const outbox = createSampleOutbox(contact.id, 'sent', 1);
    outboxStore.push(outbox);

    const worker = new ContactOutboxWorker(
      mockDb as DrizzleDb,
      mockEmailSender,
      mockEmailConfig,
    );

    const claimed = await worker.claimPendingEvents(1);
    expect(claimed).toHaveLength(0);
  });

  // 3. SMTP success -> sent
  it('3. transitions record to sent and records processedAt on SMTP success', async () => {
    const contact = createSampleContact();
    contactStore.push(contact);
    const outbox = createSampleOutbox(contact.id, 'processing', 0);
    outboxStore.push(outbox);

    const worker = new ContactOutboxWorker(
      mockDb as DrizzleDb,
      mockEmailSender,
      mockEmailConfig,
    );

    const success = await worker.processRecord(outbox);
    expect(success).toBe(true);
    expect(mockEmailSender.send).toHaveBeenCalledOnce();
    expect(outbox.status).toBe('sent');
    expect(outbox.processedAt).toBeInstanceOf(Date);
    expect(outbox.lastError).toBeNull();
  });

  // 4. SMTP fail -> retry
  it('4. increments attemptCount, transitions to pending with backoff on SMTP failure', async () => {
    const contact = createSampleContact();
    contactStore.push(contact);
    const outbox = createSampleOutbox(contact.id, 'processing', 0);
    outboxStore.push(outbox);

    vi.spyOn(mockEmailSender, 'send').mockRejectedValueOnce(
      Object.assign(new Error('Temporary connection timeout: connect ETIMEDOUT 10.0.0.1:587'), { code: 'ETIMEDOUT' }),
    );

    const worker = new ContactOutboxWorker(
      mockDb as DrizzleDb,
      mockEmailSender,
      mockEmailConfig,
    );

    const success = await worker.processRecord(outbox);
    expect(success).toBe(false);
    expect(outbox.status).toBe('pending');
    expect(outbox.attemptCount).toBe(1);
    expect(outbox.lastError).toBe('SMTP_TIMEOUT');
    expect(new Date(outbox.nextAttemptAt).getTime()).toBeGreaterThan(Date.now());
  });

  // 5. max attempts -> failed
  it('5. transitions to failed without rescheduling when max attempts reached', async () => {
    const contact = createSampleContact();
    contactStore.push(contact);
    // Already failed 4 times, next attempt is 5 (which equals maxAttempts: 5)
    const outbox = createSampleOutbox(contact.id, 'processing', 4);
    outboxStore.push(outbox);

    vi.spyOn(mockEmailSender, 'send').mockRejectedValueOnce(
      Object.assign(new Error('Permanent rejection: 550 User unknown'), { responseCode: 550 }),
    );

    const worker = new ContactOutboxWorker(
      mockDb as DrizzleDb,
      mockEmailSender,
      mockEmailConfig,
    );

    const success = await worker.processRecord(outbox);
    expect(success).toBe(false);
    expect(outbox.status).toBe('failed');
    expect(outbox.attemptCount).toBe(5);
    expect(outbox.lastError).toBe('SMTP_RECIPIENT_REJECTED');
  });

  // 6. backoff calculation
  it('6. calculates deterministic exponential backoff bounded by 3600 seconds', () => {
    const base = 10;
    // attempt 1: 10 * 2^0 = 10s
    expect(calculateBackoff(1, base)).toBe(10);
    // attempt 2: 10 * 2^1 = 20s
    expect(calculateBackoff(2, base)).toBe(20);
    // attempt 3: 10 * 2^2 = 40s
    expect(calculateBackoff(3, base)).toBe(40);
    // attempt 4: 10 * 2^3 = 80s
    expect(calculateBackoff(4, base)).toBe(80);
    // attempt 5: 10 * 2^4 = 160s
    expect(calculateBackoff(5, base)).toBe(160);
    // very high attempt: bounded by 3600
    expect(calculateBackoff(20, base)).toBe(3600);
  });

  // 7. controlled lastError
  it('7. converts arbitrary provider messages to a controlled error code', () => {
    const secretError = new Error(
      'Auth failure for smtp://user:super_secret_password123@smtp.example.com with password="very_secret_pwd"',
    );
    const sanitized = sanitizeError(secretError);
    expect(sanitized).not.toContain('super_secret_password123');
    expect(sanitized).not.toContain('very_secret_pwd');
    expect(sanitized).toBe('SMTP_UNKNOWN');

    // Long error truncation
    const longError = new Error('x'.repeat(1000));
    const truncated = sanitizeError(longError);
    expect(truncated).toBe('SMTP_UNKNOWN');
  });

  it.each([
    ['authentication', 'EAUTH', 535, 'SMTP_AUTH'],
    ['timeout', 'ETIMEDOUT', undefined, 'SMTP_TIMEOUT'],
    ['TLS', 'CERT_HAS_EXPIRED', undefined, 'SMTP_TLS'],
    ['unknown', 'UNRECOGNIZED_PROVIDER_CODE', undefined, 'SMTP_UNKNOWN'],
  ])('never persists or logs provider detail for %s failures', async (_name, code, responseCode, expectedCode) => {
    const contact = createSampleContact();
    contactStore.push(contact);
    const outbox = createSampleOutbox(contact.id, 'processing');
    outboxStore.push(outbox);
    const privateDetail = 'FAKE_SECRET smtp-username internal.smtp.local 10.8.0.4';
    vi.spyOn(mockEmailSender, 'send').mockRejectedValueOnce(
      Object.assign(new Error(privateDetail), { code, responseCode }),
    );
    const worker = new ContactOutboxWorker(mockDb as DrizzleDb, mockEmailSender, mockEmailConfig);
    const logSpy = vi.spyOn((worker as any).logger, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn((worker as any).logger, 'error').mockImplementation(() => {});

    expect(await worker.processRecord(outbox)).toBe(false);
    expect(outbox.lastError).toBe(expectedCode);
    expect(outbox.attemptCount).toBe(1);
    expect(outbox.status).toBe('pending');
    expect(JSON.stringify([logSpy.mock.calls, errorSpy.mock.calls, outbox.lastError])).not.toContain(privateDetail);
  });

  // 8. email content mapping
  it('8. maps all required contact fields into email and excludes private admin fields', () => {
    const contact = createSampleContact();
    const outboxId = randomUUID();
    const emailData = buildContactNotificationEmail(contact, outboxId);

    // Check subject
    expect(emailData.subject).toContain(contact.fullName);
    expect(emailData.subject).toContain(contact.subject);

    // Check body contains all visitor fields
    expect(emailData.text).toContain(contact.fullName);
    expect(emailData.text).toContain(contact.companyName!);
    expect(emailData.text).toContain(contact.email);
    expect(emailData.text).toContain(contact.phone!);
    expect(emailData.text).toContain(contact.message);
    expect(emailData.text).toContain(contact.id);

    // Crucial safety: Must NOT contain private admin fields
    expect(emailData.text).not.toContain(contact.adminNote!);
    expect(emailData.html).not.toContain(contact.adminNote!);
    expect(emailData.text).not.toContain('password');

    // Message ID format
    expect(emailData.messageId).toBe(`<contact-outbox-${outboxId}@ltvietnam.com.vn>`);
  });

  // 9. HTML escaping
  it('9. properly escapes HTML characters in user input to prevent injection', () => {
    const maliciousContact = {
      ...createSampleContact(),
      fullName: '<script>alert("xss")</script>',
      companyName: 'O\'Reilly & Associates <test>',
      message: 'Test "quotes" & <tags>',
    };
    const outboxId = randomUUID();
    const emailData = buildContactNotificationEmail(maliciousContact, outboxId);

    expect(emailData.html).not.toContain('<script>');
    expect(emailData.html).toContain('&lt;script&gt;');
    expect(emailData.html).toContain('&amp;');
    expect(emailData.html).toContain('&quot;quotes&quot;');
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  // 10. missing config behavior
  it('10. defers execution and avoids burning attempts when SMTP config is missing', async () => {
    const contact = createSampleContact();
    contactStore.push(contact);
    const outbox = createSampleOutbox(contact.id, 'processing', 0);
    outboxStore.push(outbox);

    // Emulate unconfigured SMTP
    vi.spyOn(mockEmailConfig, 'isSmtpConfigured').mockResolvedValue(false);

    const worker = new ContactOutboxWorker(
      mockDb as DrizzleDb,
      mockEmailSender,
      mockEmailConfig,
    );

    const result = await worker.processRecord(outbox);
    expect(result).toBe(false);
    expect(mockEmailSender.send).not.toHaveBeenCalled();
    // Record should be deferred as pending, attempt count should NOT increase
    expect(outbox.status).toBe('pending');
    expect(outbox.attemptCount).toBe(0);
    expect(outbox.lastError).toContain('SMTP configuration is incomplete');
    expect(new Date(outbox.nextAttemptAt).getTime()).toBeGreaterThan(Date.now());
  });

  // 11. stale lease reclaim
  it('11. reclaims stale processing record when updatedAt exceeds processingLeaseSeconds', async () => {
    const contact = createSampleContact();
    contactStore.push(contact);
    // Record stuck in 'processing' 400 seconds ago (lease is 300s)
    const outbox = createSampleOutbox(contact.id, 'processing', 1);
    outbox.updatedAt = new Date(Date.now() - 400 * 1000);
    outboxStore.push(outbox);

    const worker = new ContactOutboxWorker(
      mockDb as DrizzleDb,
      mockEmailSender,
      mockEmailConfig,
    );

    const claimed = await worker.claimPendingEvents(1, 300);
    expect(claimed).toHaveLength(1);
    expect(claimed[0].id).toBe(outbox.id);
  });

  // 12. active processing not reclaimed
  it('12. does NOT reclaim processing record if lease is still active', async () => {
    const contact = createSampleContact();
    contactStore.push(contact);
    // Record in 'processing' only 30 seconds ago (lease is 300s)
    const outbox = createSampleOutbox(contact.id, 'processing', 1);
    outbox.updatedAt = new Date(Date.now() - 30 * 1000);
    outboxStore.push(outbox);

    const worker = new ContactOutboxWorker(
      mockDb as DrizzleDb,
      mockEmailSender,
      mockEmailConfig,
    );

    const claimed = await worker.claimPendingEvents(1, 300);
    expect(claimed).toHaveLength(0);
  });
});
