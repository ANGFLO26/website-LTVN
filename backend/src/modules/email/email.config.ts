import { Injectable, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { like } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../../database/database.module.js';
import * as schema from '../../database/schema.js';
import { decrypt, isEncryptedEnvelope } from '../../common/encryption.util.js';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  from: string;
  to: string;
}

export interface WorkerConfig {
  maxAttempts: number;
  retryBaseSeconds: number;
  pollIntervalMs: number;
  processingLeaseSeconds: number;
  enabled: boolean;
}

@Injectable()
export class EmailConfigService {
  private cachedEffectiveSmtp: SmtpConfig | null = null;
  private cacheExpiresAt = 0;
  private readonly CACHE_TTL_MS = 5000; // 5-second TTL cache for cluster read-through

  constructor(
    private readonly config: ConfigService,
    @Optional() @Inject(DRIZZLE) private readonly db?: DrizzleDb,
  ) {}

  invalidateCache(): void {
    this.cacheExpiresAt = 0;
    this.cachedEffectiveSmtp = null;
  }

  /**
   * Environment-only fallback configuration
   */
  getEnvSmtpConfig(): SmtpConfig | null {
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const portRaw = this.config.get<string | number>('SMTP_PORT');
    const port = portRaw ? Number(portRaw) : 587;
    const secureRaw = this.config.get<string | boolean>('SMTP_SECURE');
    const secure = secureRaw === true || secureRaw === 'true' || port === 465;

    const user = this.config.get<string>('SMTP_USERNAME')?.trim();
    const pass = this.config.get<string>('SMTP_PASSWORD')?.trim();
    const from = this.config.get<string>('SMTP_FROM')?.trim() || 'no-reply@ltvietnam.com.vn';
    const to =
      this.config.get<string>('CONTACT_NOTIFICATION_TO')?.trim() || 'contact@ltvietnam.com.vn';

    if (!host) {
      return null;
    }

    const config: SmtpConfig = {
      host,
      port: Number.isFinite(port) && port > 0 ? port : 587,
      secure,
      from,
      to,
    };

    if (user && pass) {
      config.auth = { user, pass };
    }

    return config;
  }

  /**
   * Synchronous accessor for backwards-compatibility and quick checks
   * Returns cached effective config, or falls back to env config
   */
  getSmtpConfig(): SmtpConfig | null {
    if (this.cachedEffectiveSmtp) {
      return this.cachedEffectiveSmtp;
    }
    return this.getEnvSmtpConfig();
  }

  /**
   * Resolves effective configuration: Database Admin Settings -> Environment Fallback
   */
  async getEffectiveSmtpConfig(): Promise<SmtpConfig | null> {
    const now = Date.now();
    if (this.cachedEffectiveSmtp && now < this.cacheExpiresAt) {
      return this.cachedEffectiveSmtp;
    }

    const envConfig = this.getEnvSmtpConfig();

    if (!this.db) {
      this.cachedEffectiveSmtp = envConfig;
      this.cacheExpiresAt = now + this.CACHE_TTL_MS;
      return envConfig;
    }

    try {
      const dbSettings = await this.db.query.systemSettings.findMany({
        where: like(schema.systemSettings.key, 'email.%'),
      });

      const map = new Map<string, { value: string; isEncrypted: boolean }>();
      for (const row of dbSettings) {
        map.set(row.key, { value: row.value, isEncrypted: row.isEncrypted });
      }

      const host = map.get('email.smtp_host')?.value.trim() || envConfig?.host;
      if (!host) {
        this.cachedEffectiveSmtp = null;
        this.cacheExpiresAt = now + this.CACHE_TTL_MS;
        return null;
      }

      const portRaw = map.get('email.smtp_port')?.value;
      const port = portRaw ? Number(portRaw) : envConfig?.port || 587;

      const secureRaw = map.get('email.smtp_secure')?.value;
      const secure =
        secureRaw !== undefined
          ? secureRaw === 'true'
          : envConfig?.secure ?? port === 465;

      const from =
        map.get('email.smtp_from')?.value.trim() ||
        envConfig?.from ||
        'no-reply@ltvietnam.com.vn';

      const to =
        map.get('email.notification_recipient')?.value.trim() ||
        envConfig?.to ||
        'contact@ltvietnam.com.vn';

      const user =
        map.get('email.smtp_username')?.value.trim() || envConfig?.auth?.user || '';

      // Password resolution: DB encrypted password -> env password
      let pass = '';
      const dbPassEntry = map.get('email.smtp_password');
      if (dbPassEntry && dbPassEntry.value.trim().length > 0) {
        try {
          if (dbPassEntry.isEncrypted || isEncryptedEnvelope(dbPassEntry.value)) {
            pass = decrypt(dbPassEntry.value.trim());
          } else {
            pass = dbPassEntry.value.trim();
          }
        } catch {
          // If decryption fails, fall back to env password
          pass = envConfig?.auth?.pass || '';
        }
      } else {
        pass = envConfig?.auth?.pass || '';
      }

      const effective: SmtpConfig = {
        host,
        port: Number.isFinite(port) && port > 0 ? port : 587,
        secure,
        from,
        to,
      };

      if (user && pass) {
        effective.auth = { user, pass };
      }

      this.cachedEffectiveSmtp = effective;
      this.cacheExpiresAt = now + this.CACHE_TTL_MS;
      return effective;
    } catch {
      // In case of DB error, gracefully fall back to env
      this.cachedEffectiveSmtp = envConfig;
      this.cacheExpiresAt = now + this.CACHE_TTL_MS;
      return envConfig;
    }
  }

  async isSmtpConfigured(): Promise<boolean> {
    const config = await this.getEffectiveSmtpConfig();
    return Boolean(config && config.host && config.to && config.from);
  }

  getWorkerConfig(): WorkerConfig {
    const maxAttemptsRaw = this.config.get<string | number>('OUTBOX_MAX_ATTEMPTS');
    const maxAttempts = maxAttemptsRaw ? Number(maxAttemptsRaw) : 5;

    const retryBaseRaw = this.config.get<string | number>('OUTBOX_RETRY_BASE_SECONDS');
    const retryBaseSeconds = retryBaseRaw ? Number(retryBaseRaw) : 10;

    const pollIntervalRaw = this.config.get<string | number>('OUTBOX_POLL_INTERVAL_MS');
    const pollIntervalMs = pollIntervalRaw ? Number(pollIntervalRaw) : 5000;

    const leaseRaw = this.config.get<string | number>('OUTBOX_PROCESSING_LEASE_SECONDS');
    const processingLeaseSeconds = leaseRaw ? Number(leaseRaw) : 300;

    const enabledRaw = this.config.get<string | boolean>('OUTBOX_WORKER_ENABLED');
    const enabled = enabledRaw === undefined ? true : enabledRaw === true || enabledRaw === 'true';

    return {
      maxAttempts: Number.isFinite(maxAttempts) && maxAttempts > 0 ? maxAttempts : 5,
      retryBaseSeconds:
        Number.isFinite(retryBaseSeconds) && retryBaseSeconds > 0 ? retryBaseSeconds : 10,
      pollIntervalMs:
        Number.isFinite(pollIntervalMs) && pollIntervalMs >= 100 ? pollIntervalMs : 5000,
      processingLeaseSeconds:
        Number.isFinite(processingLeaseSeconds) && processingLeaseSeconds > 0
          ? processingLeaseSeconds
          : 300,
      enabled,
    };
  }
}
