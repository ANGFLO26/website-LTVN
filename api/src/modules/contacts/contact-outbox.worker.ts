import {
  Injectable,
  Inject,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { eq, sql as dSql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../../database/database.module.js';
import * as schema from '../../database/schema.js';
import { EmailConfigService } from '../email/email.config.js';
import { EMAIL_SENDER, type IEmailSender } from '../email/email-sender.interface.js';
import { buildContactNotificationEmail } from '../email/templates/contact-notification.template.js';
import { classifySmtpFailure } from '../email/smtp-failure.js';

export function calculateBackoff(attemptCount: number, baseSeconds: number): number {
  const safeAttempt = Math.max(1, attemptCount);
  const backoff = baseSeconds * Math.pow(2, safeAttempt - 1);
  return Math.min(backoff, 3600); // Upper bound of 1 hour
}

export function sanitizeError(error: unknown): string {
  return classifySmtpFailure(error);
}

@Injectable()
export class ContactOutboxWorker implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ContactOutboxWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;
  private activeProcessingPromise: Promise<number> | null = null;
  private lastConfigWarningTime = 0;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(EMAIL_SENDER) private readonly emailSender: IEmailSender,
    private readonly emailConfig: EmailConfigService,
  ) {}

  onApplicationBootstrap(): void {
    const workerConfig = this.emailConfig.getWorkerConfig();
    if (!workerConfig.enabled) {
      this.logger.log('Contact Outbox Worker is disabled by OUTBOX_WORKER_ENABLED=false');
      return;
    }

    this.logger.log(
      `Khởi động Contact Outbox Worker (pollInterval: ${workerConfig.pollIntervalMs}ms, ` +
        `maxAttempts: ${workerConfig.maxAttempts}, baseBackoff: ${workerConfig.retryBaseSeconds}s, ` +
        `lease: ${workerConfig.processingLeaseSeconds}s)`,
    );

    this.scheduleNextPoll(workerConfig.pollIntervalMs);
  }

  async onApplicationShutdown(): Promise<void> {
    this.isShuttingDown = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.activeProcessingPromise) {
      await this.activeProcessingPromise.catch(() => {});
    }
  }

  private scheduleNextPoll(delayMs: number): void {
    if (this.isShuttingDown) return;

    this.timer = setTimeout(async () => {
      try {
        await this.runWorkerTick();
      } catch (err) {
        this.logger.error(`Lỗi không mong muốn trong outbox worker tick. code=${sanitizeError(err)}`);
      } finally {
        if (!this.isShuttingDown) {
          const config = this.emailConfig.getWorkerConfig();
          this.scheduleNextPoll(config.pollIntervalMs);
        }
      }
    }, delayMs);
  }

  private async runWorkerTick(): Promise<number> {
    if (this.isShuttingDown) return 0;
    this.activeProcessingPromise = this.processNextBatch();
    try {
      return await this.activeProcessingPromise;
    } finally {
      this.activeProcessingPromise = null;
    }
  }

  /**
   * Atomic PostgreSQL claim using FOR UPDATE SKIP LOCKED
   * Reclaims stale processing events older than processingLeaseSeconds
   */
  async claimPendingEvents(
    batchSize = 1,
    processingLeaseSeconds?: number,
  ): Promise<schema.ContactOutbox[]> {
    const leaseSeconds =
      processingLeaseSeconds ?? this.emailConfig.getWorkerConfig().processingLeaseSeconds;

    const result = await this.db.execute(dSql`
      WITH claimable AS (
        SELECT id FROM contact_outbox
        WHERE (
          (status = 'pending' AND next_attempt_at <= NOW())
          OR
          (status = 'processing' AND updated_at < NOW() - (${leaseSeconds} || ' seconds')::interval)
        )
        AND event_type = 'contact.notification.requested'
        ORDER BY next_attempt_at ASC, created_at ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE contact_outbox
      SET status = 'processing', updated_at = NOW()
      FROM claimable
      WHERE contact_outbox.id = claimable.id
      RETURNING contact_outbox.id, contact_outbox.contact_id, contact_outbox.event_type,
                contact_outbox.status, contact_outbox.attempt_count, contact_outbox.next_attempt_at,
                contact_outbox.last_error, contact_outbox.processed_at, contact_outbox.created_at,
                contact_outbox.updated_at;
    `);

    const rows = Array.isArray(result) ? result : [];

    return rows.map((raw) => {
      const row = raw as Record<string, unknown>;
      return {
        id: String(row.id),
        contactId: String(row.contact_id ?? row.contactId),
        eventType: String(row.event_type ?? row.eventType),
        status: String(row.status) as schema.ContactOutbox['status'],
        attemptCount: Number(row.attempt_count ?? row.attemptCount ?? 0),
        nextAttemptAt: new Date((row.next_attempt_at ?? row.nextAttemptAt) as string | Date),
        lastError: (row.last_error ?? row.lastError ?? null) as string | null,
        processedAt:
          row.processed_at || row.processedAt
            ? new Date((row.processed_at || row.processedAt) as string | Date)
            : null,
        createdAt: new Date((row.created_at ?? row.createdAt) as string | Date),
        updatedAt: new Date((row.updated_at ?? row.updatedAt) as string | Date),
      };
    });
  }

  /**
   * Process a single outbox record: load contact, send email, and update status
   */
  async processRecord(record: schema.ContactOutbox): Promise<boolean> {
    if (record.eventType !== 'contact.notification.requested') {
      this.logger.warn(`Bỏ qua sự kiện không được hỗ trợ: ${record.eventType} (ID: ${record.id})`);
      await this.db
        .update(schema.contactOutbox)
        .set({ status: 'sent', processedAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.contactOutbox.id, record.id));
      return true;
    }

    const workerConfig = this.emailConfig.getWorkerConfig();

    // Check SMTP configuration availability
    const isConfigured = await this.emailConfig.isSmtpConfigured();
    if (!isConfigured) {
      const now = Date.now();
      if (now - this.lastConfigWarningTime > 60000) {
        this.logger.warn(
          'Chưa cấu hình SMTP hoặc thiếu thông tin (SMTP_HOST, CONTACT_NOTIFICATION_TO). ' +
            'Outbox worker tạm hoãn gửi email và chờ cấu hình.',
        );
        this.lastConfigWarningTime = now;
      }

      // Safe deferral: keep as pending, defer next attempt by 60s without burning attempts
      await this.db
        .update(schema.contactOutbox)
        .set({
          status: 'pending',
          nextAttemptAt: new Date(Date.now() + 60000),
          lastError: 'SMTP configuration is incomplete. Worker waiting for valid configuration.',
          updatedAt: new Date(),
        })
        .where(eq(schema.contactOutbox.id, record.id));
      return false;
    }

    // Load contact details
    const contact = await this.db.query.contacts.findFirst({
      where: eq(schema.contacts.id, record.contactId),
    });

    if (!contact) {
      this.logger.error(
        `Không tìm thấy Contact tương ứng với outbox ID ${record.id} (Contact ID: ${record.contactId})`,
      );
      await this.db
        .update(schema.contactOutbox)
        .set({
          status: 'failed',
          lastError: `Contact record ${record.contactId} not found.`,
          updatedAt: new Date(),
        })
        .where(eq(schema.contactOutbox.id, record.id));
      return false;
    }

    const smtpConfig = await this.emailConfig.getEffectiveSmtpConfig();
    const toAddress = smtpConfig?.to || 'contact@ltvietnam.com.vn';
    const emailData = buildContactNotificationEmail(contact, record.id);

    try {
      await this.emailSender.send({
        to: toAddress,
        from: smtpConfig?.from,
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
        messageId: emailData.messageId,
      });

      // Mark SENT on success
      await this.db
        .update(schema.contactOutbox)
        .set({
          status: 'sent',
          processedAt: new Date(),
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(schema.contactOutbox.id, record.id));

      this.logger.log(`Gửi email thành công cho Contact ${contact.id} (Outbox ID: ${record.id})`);
      return true;
    } catch (err) {
      const sanitized = sanitizeError(err);
      const newAttemptCount = record.attemptCount + 1;
      const isMaxExceeded = newAttemptCount >= workerConfig.maxAttempts;

      if (isMaxExceeded) {
        this.logger.error(
          `Outbox ID ${record.id} đã đạt số lần thử tối đa (${newAttemptCount}/${workerConfig.maxAttempts}). Chuyển trạng thái 'failed'. Lỗi: ${sanitized}`,
        );

        await this.db
          .update(schema.contactOutbox)
          .set({
            status: 'failed',
            attemptCount: newAttemptCount,
            lastError: sanitized,
            updatedAt: new Date(),
          })
          .where(eq(schema.contactOutbox.id, record.id));
      } else {
        const delaySeconds = calculateBackoff(newAttemptCount, workerConfig.retryBaseSeconds);
        const nextAttemptAt = new Date(Date.now() + delaySeconds * 1000);

        this.logger.warn(
          `Gửi email thất bại cho Outbox ID ${record.id} (Lần ${newAttemptCount}/${workerConfig.maxAttempts}). ` +
            `Thử lại sau ${delaySeconds}s (vào lúc ${nextAttemptAt.toISOString()}). Lỗi: ${sanitized}`,
        );

        await this.db
          .update(schema.contactOutbox)
          .set({
            status: 'pending',
            attemptCount: newAttemptCount,
            nextAttemptAt,
            lastError: sanitized,
            updatedAt: new Date(),
          })
          .where(eq(schema.contactOutbox.id, record.id));
      }

      return false;
    }
  }

  /**
   * Process a batch of pending/stale outbox items
   * Returns the count of processed items
   */
  async processNextBatch(batchSize = 10): Promise<number> {
    let processedTotal = 0;

    while (!this.isShuttingDown && processedTotal < batchSize) {
      const claimed = await this.claimPendingEvents(1);
      if (claimed.length === 0) {
        break; // No more eligible events
      }

      const record = claimed[0];
      await this.processRecord(record);
      processedTotal++;
    }

    return processedTotal;
  }
}
