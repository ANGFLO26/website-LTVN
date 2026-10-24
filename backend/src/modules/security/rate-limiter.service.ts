import {
  Injectable,
  Inject,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../../database/database.module.js';

export interface RateLimitResult {
  allowed: boolean;
  requestCount: number;
  maxRequests: number;
  remaining: number;
  windowStart: Date;
  expiresAt: Date;
  retryAfterSeconds?: number;
}

interface InMemoryBucket {
  count: number;
  windowStart: Date;
  expiresAt: Date;
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly hashSecret: string;
  private readonly isProduction: boolean;
  private readonly isTest: boolean;
  private readonly memoryBuckets = new Map<string, InMemoryBucket>();

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly configService: ConfigService,
  ) {
    this.isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const rawSecret = this.configService.get<string>('RATE_LIMIT_HASH_SECRET');

    if (this.isProduction && (!rawSecret || rawSecret.trim().length < 16)) {
      throw new Error(
        'RATE_LIMIT_HASH_SECRET environment variable is required and must be at least 16 characters in production'
      );
    }

    this.hashSecret = rawSecret?.trim() || 'default-dev-rate-limit-hash-secret-min16chars';
  }

  /**
   * Canonicalizes IPv4, IPv6, and IPv4-mapped IPv6 for one quota per address.
   */
  normalizeIp(ip?: string | null): string {
    if (!ip) return '127.0.0.1';
    const clean = ip.trim().toLowerCase();
    const family = isIP(clean);
    if (family === 4) return clean;
    if (family !== 6) return 'unknown';
    const canonical = new URL(`http://[${clean}]`).hostname.slice(1, -1);
    const mapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(canonical);
    if (mapped) {
      const high = Number.parseInt(mapped[1], 16);
      const low = Number.parseInt(mapped[2], 16);
      return `${high >>> 8}.${high & 255}.${low >>> 8}.${low & 255}`;
    }
    return canonical;
  }

  /**
   * Computes PII-safe deterministic HMAC-SHA256 hash of client identifier using server secret.
   */
  hashSubject(subject: string): string {
    return createHmac('sha256', this.hashSecret).update(subject).digest('hex');
  }

  /**
   * Resolves configured default limits by scope.
   */
  getDefaultLimits(scope: string): { max: number; windowSeconds: number } {
    const configuredLimit = (key: string, prodDefault: number, testDefault = 1000) => {
      const val = this.configService.get<string>(key);
      if (val !== undefined && val !== null && val !== '') {
        return Number(val);
      }
      return this.isTest ? testDefault : prodDefault;
    };

    switch (scope) {
      case 'auth:login':
        return {
          max: configuredLimit('RATE_LIMIT_LOGIN_MAX', 5),
          windowSeconds:
            Number(this.configService.get<string>('RATE_LIMIT_LOGIN_WINDOW_SECONDS')) || 300,
        };
      case 'auth:forgot-password':
        return {
          max: configuredLimit('RATE_LIMIT_FORGOT_PASSWORD_MAX', 3),
          windowSeconds:
            Number(this.configService.get<string>('RATE_LIMIT_FORGOT_PASSWORD_WINDOW_SECONDS')) || 900,
        };
      case 'auth:reset-password':
        return {
          max: configuredLimit('RATE_LIMIT_RESET_PASSWORD_MAX', 5),
          windowSeconds:
            Number(this.configService.get<string>('RATE_LIMIT_RESET_PASSWORD_WINDOW_SECONDS')) || 900,
        };
      case 'contacts:submit':
      case 'contacts':
        return {
          max: configuredLimit('RATE_LIMIT_CONTACT_MAX', 5),
          windowSeconds:
            Number(this.configService.get<string>('RATE_LIMIT_CONTACT_WINDOW_SECONDS')) || 600,
        };
      default:
        return { max: 10, windowSeconds: 60 };
    }
  }

  /**
   * Atomically consumes 1 request token for the given scope and client subject.
   */
  async consume(
    scope: string,
    rawSubject: string,
    overrideMax?: number,
    overrideWindowSeconds?: number,
  ): Promise<RateLimitResult> {
    const defaults = this.getDefaultLimits(scope);
    const maxRequests = overrideMax ?? defaults.max;
    const windowSeconds = overrideWindowSeconds ?? defaults.windowSeconds;

    const normalizedIp = this.normalizeIp(rawSubject);
    const subjectHash = this.hashSubject(normalizedIp);
    const key = `${scope}:${subjectHash}`;

    // If DRIZZLE mock does not implement execute (e.g. some isolated unit test harnesses), fallback safely to memory store
    if (!this.db || typeof (this.db as any).execute !== 'function') {
      if (this.isProduction || this.configService.get<string>('RATE_LIMIT_FAIL_CLOSED') === 'true') {
        throw new HttpException(
          {
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            error: 'Service Unavailable',
            message: 'Dịch vụ bảo vệ tạm thời không khả dụng. Vui lòng thử lại sau ít phút.',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      return this.consumeMemory(key, maxRequests, windowSeconds);
    }

    const now = new Date();
    const windowExpiresAt = new Date(now.getTime() + windowSeconds * 1000);
    const nowIso = now.toISOString();
    const windowExpiresIso = windowExpiresAt.toISOString();

    // Opportunistic bounded cleanup (1% rate in non-test mode)
    if (!this.isTest && Math.random() < 0.01) {
      this.cleanupExpired().catch(() => {});
    }

    try {
      const result = await this.db.execute(sql`
        INSERT INTO "rate_limit_buckets" (
          "key", "scope", "subject_hash", "request_count", "window_start", "expires_at", "created_at", "updated_at"
        )
        VALUES (
          ${key}, ${scope}, ${subjectHash}, 1, ${nowIso}::timestamptz, ${windowExpiresIso}::timestamptz, NOW(), NOW()
        )
        ON CONFLICT ("key")
        DO UPDATE SET
          request_count = CASE
            WHEN "rate_limit_buckets"."expires_at" <= ${nowIso}::timestamptz THEN 1
            ELSE "rate_limit_buckets"."request_count" + 1
          END,
          window_start = CASE
            WHEN "rate_limit_buckets"."expires_at" <= ${nowIso}::timestamptz THEN ${nowIso}::timestamptz
            ELSE "rate_limit_buckets"."window_start"
          END,
          expires_at = CASE
            WHEN "rate_limit_buckets"."expires_at" <= ${nowIso}::timestamptz THEN ${windowExpiresIso}::timestamptz
            ELSE "rate_limit_buckets"."expires_at"
          END,
          updated_at = NOW()
        RETURNING "request_count", "expires_at", "window_start"
      `);

      const rows: any[] = Array.isArray(result) ? result : (result as any)?.rows || [];
      const row = rows[0] || {};
      const requestCount = Number(row.request_count ?? 1);
      const expiresAt = row.expires_at ? new Date(row.expires_at) : windowExpiresAt;
      const windowStart = row.window_start ? new Date(row.window_start) : now;

      const allowed = requestCount <= maxRequests;
      const remaining = Math.max(0, maxRequests - requestCount);
      const retryAfterSeconds = allowed
        ? undefined
        : Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));

      return {
        allowed,
        requestCount,
        maxRequests,
        remaining,
        windowStart,
        expiresAt,
        retryAfterSeconds,
      };
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      this.logger.error('Database rate limit query failed');
      if (this.isProduction || this.configService.get<string>('RATE_LIMIT_FAIL_CLOSED') === 'true') {
        throw new HttpException(
          {
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            error: 'Service Unavailable',
            message: 'Dịch vụ bảo vệ tạm thời không khả dụng. Vui lòng thử lại sau ít phút.',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      return this.consumeMemory(key, maxRequests, windowSeconds);
    }
  }

  /**
   * Fallback in-memory rate limiter for isolated test mocks or DB degradation.
   */
  private consumeMemory(
    key: string,
    maxRequests: number,
    windowSeconds: number,
  ): RateLimitResult {
    const now = new Date();
    const existing = this.memoryBuckets.get(key);

    if (!existing || existing.expiresAt <= now) {
      if (this.memoryBuckets.size >= 1000) {
        for (const [k, v] of this.memoryBuckets.entries()) {
          if (v.expiresAt <= now) {
            this.memoryBuckets.delete(k);
          }
        }
        if (this.memoryBuckets.size >= 5000) {
          const oldestKey = this.memoryBuckets.keys().next().value;
          if (oldestKey !== undefined) {
            this.memoryBuckets.delete(oldestKey);
          }
        }
      }
      const expiresAt = new Date(now.getTime() + windowSeconds * 1000);
      this.memoryBuckets.set(key, { count: 1, windowStart: now, expiresAt });
      return {
        allowed: true,
        requestCount: 1,
        maxRequests,
        remaining: maxRequests - 1,
        windowStart: now,
        expiresAt,
      };
    }

    existing.count += 1;
    const allowed = existing.count <= maxRequests;
    const remaining = Math.max(0, maxRequests - existing.count);
    const retryAfterSeconds = allowed
      ? undefined
      : Math.max(1, Math.ceil((existing.expiresAt.getTime() - Date.now()) / 1000));

    return {
      allowed,
      requestCount: existing.count,
      maxRequests,
      remaining,
      windowStart: existing.windowStart,
      expiresAt: existing.expiresAt,
      retryAfterSeconds,
    };
  }

  /**
   * Enforces rate limit and throws standard HTTP 429 if limit is exceeded.
   */
  async enforce(
    scope: string,
    rawSubject: string,
    overrideMax?: number,
    overrideWindowSeconds?: number,
  ): Promise<RateLimitResult> {
    const result = await this.consume(scope, rawSubject, overrideMax, overrideWindowSeconds);

    if (!result.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.',
          retryAfter: result.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return result;
  }

  /**
   * Cleanup expired records older than 24 hours in bounded batches (max 5000 rows per batch)
   * using a CTE to prevent table locks, connection pool starvation, and statement timeouts under bot floods.
   */
  async cleanupExpired(batchSize = 5000): Promise<number> {
    try {
      if (this.db && typeof (this.db as any).execute === 'function') {
        const res = await this.db.execute(sql`
          WITH expired AS (
            SELECT "key"
            FROM "rate_limit_buckets"
            WHERE "expires_at" < NOW() - INTERVAL '24 hours'
            LIMIT ${batchSize}
          )
          DELETE FROM "rate_limit_buckets"
          WHERE "key" IN (SELECT "key" FROM expired)
        `);
        return (res as any)?.rowCount ?? (res as any)?.count ?? 0;
      }
    } catch {
      // Ignored non-fatal cleanup error
    }
    return 0;
  }

  /**
   * Resets in-memory bucket store for isolated test fixtures.
   */
  clearMemoryBucketsForTest(): void {
    this.memoryBuckets.clear();
  }
}


