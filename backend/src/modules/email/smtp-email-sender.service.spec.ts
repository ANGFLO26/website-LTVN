import { beforeEach, describe, expect, it, vi } from 'vitest';
import nodemailer from 'nodemailer';
import { SmtpEmailSenderService } from './smtp-email-sender.service.js';
import { SmtpDeliveryError } from './smtp-failure.js';
import type { EmailConfigService } from './email.config.js';

vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn() } }));

describe('F04 SMTP sender disclosure', () => {
  const sendMail = vi.fn();
  const config = {
    host: 'internal.smtp.local',
    port: 587,
    secure: false,
    from: 'sender@example.com',
    to: 'recipient@example.com',
    auth: { user: 'smtp-username', pass: 'FAKE_SECRET' },
  };
  let service: SmtpEmailSenderService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail,
    } as never);
    service = new SmtpEmailSenderService({
      getEffectiveSmtpConfig: vi.fn(async () => config),
    } as unknown as EmailConfigService);
  });

  it.each([
    ['EAUTH', 535, 'SMTP_AUTH'],
    ['ETIMEDOUT', undefined, 'SMTP_TIMEOUT'],
    ['CERT_HAS_EXPIRED', undefined, 'SMTP_TLS'],
    ['UNKNOWN', undefined, 'SMTP_UNKNOWN'],
  ])(
    'maps %s provider failures without leaking provider details',
    async (code, responseCode, expectedCode) => {
      const secretDetail =
        'FAKE_SECRET smtp-username internal.smtp.local 10.8.0.4';
      sendMail.mockRejectedValueOnce(
        Object.assign(new Error(secretDetail), { code, responseCode }),
      );
      const errorLog = vi
        .spyOn((service as any).logger, 'error')
        .mockImplementation(() => {});
      const startupLog = vi
        .spyOn((service as any).logger, 'log')
        .mockImplementation(() => {});

      const error = await service
        .send({
          to: 'recipient@example.com',
          subject: 'test',
          text: 'test',
          html: '<p>test</p>',
        })
        .catch((caught) => caught);

      expect(error).toBeInstanceOf(SmtpDeliveryError);
      expect(error.message).toBe(expectedCode);
      expect(
        JSON.stringify([
          errorLog.mock.calls,
          startupLog.mock.calls,
          error.message,
        ]),
      ).not.toContain(secretDetail);
      expect(
        JSON.stringify([errorLog.mock.calls, startupLog.mock.calls]),
      ).not.toMatch(
        /FAKE_SECRET|smtp-username|internal\.smtp\.local|10\.8\.0\.4/,
      );
    },
  );
});
