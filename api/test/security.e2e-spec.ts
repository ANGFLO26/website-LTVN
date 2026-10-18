import { randomBytes, randomUUID } from 'node:crypto';
import { type INestApplication, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import request from 'supertest';
import type { App } from 'supertest/types';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { DRIZZLE } from '../src/database/database.module.js';
import type * as schema from '../src/database/schema.js';
import { RateLimiterService } from '../src/modules/security/rate-limiter.service.js';

describe('PR-04B: Security E2E (Rate Limiting & CAPTCHA Enforcement)', () => {
  let app: INestApplication<App>;
  let rateLimiter: RateLimiterService;
  const adminId = randomUUID();
  const email = `admin-${randomUUID()}@example.com`;
  const password = 'StrongPassword!2026';
  let adminUser: schema.User;

  const mockUsersFindFirst = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();

  beforeAll(async () => {
    adminUser = {
      id: adminId,
      email,
      fullName: 'Security Admin',
      passwordHash: await hash(password, 4),
      tokenVersion: 0,
      role: 'admin',
      status: 'active',
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: randomUUID(), status: 'new' }]),
      }),
    });

    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          NODE_ENV: 'test',
          JWT_SECRET: randomBytes(32).toString('base64url'),
          JWT_TTL_SECONDS: '3600',
          RATE_LIMIT_ENABLED: 'true',
          RATE_LIMIT_HASH_SECRET: 'test-secret-at-least-16-characters-long',
          TURNSTILE_ENABLED: 'true',
          TURNSTILE_SECRET_KEY: 'test-turnstile-secret-16chars',
          TURNSTILE_ALLOWED_HOSTNAMES: 'localhost',
          RATE_LIMIT_LOGIN_MAX: '3',
          RATE_LIMIT_LOGIN_WINDOW_SECONDS: '60',
          RATE_LIMIT_CONTACT_MAX: '2',
          RATE_LIMIT_CONTACT_WINDOW_SECONDS: '60',
          RATE_LIMIT_FORGOT_PASSWORD_MAX: '2',
          RATE_LIMIT_FORGOT_PASSWORD_WINDOW_SECONDS: '60',
          RATE_LIMIT_RESET_PASSWORD_MAX: '2',
          RATE_LIMIT_RESET_PASSWORD_WINDOW_SECONDS: '60',
        })
      )
      .overrideProvider(DRIZZLE)
      .useValue({
        query: {
          users: { findFirst: mockUsersFindFirst },
          passwordResetTokens: { findFirst: vi.fn() },
          systemSettings: { findFirst: vi.fn() },
          contacts: { findMany: vi.fn(), findFirst: vi.fn() },
        },
        insert: mockInsert,
        update: mockUpdate,
        transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => {
          const tx = {
            query: {
              users: { findFirst: mockUsersFindFirst },
              passwordResetTokens: { findFirst: vi.fn() },
            },
            insert: mockInsert,
            update: mockUpdate,
          };
          return cb(tx);
        }),
      })
      .compile();

    app = moduleRef.createNestApplication();
    // Simulate same-host NGINX. Express derives req.ip from its trusted-proxy policy.
    app.getHttpAdapter().getInstance().set('trust proxy', ['loopback']);
    app.setGlobalPrefix('api');
    await app.init();

    rateLimiter = moduleRef.get(RateLimiterService);
  });

  beforeEach(() => {
    mockUsersFindFirst.mockReset();
    mockUsersFindFirst.mockResolvedValue(adminUser);
    mockInsert.mockClear();
    mockUpdate.mockClear();
    if (rateLimiter) {
      rateLimiter.clearMemoryBucketsForTest();
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    [{ success: true, hostname: 'localhost' }, 400],
    [{ success: true, action: 'login' }, 400],
    [{ success: true, action: 'forgot_password', hostname: 'localhost' }, 400],
    [{ success: true, action: 'login', hostname: 'other.example' }, 400],
    [{ success: true, action: 'login', hostname: 'localhost' }, 200],
  ])('F10 enforces provider action and hostname in HTTP login path: %j', async (providerBody, status) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => providerBody,
    } as Response);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('X-Captcha-Token', 'provider-test-token')
      .send({ email, password })
      .expect(status);
    vi.restoreAllMocks();
    if (status === 400) expect(mockUsersFindFirst).not.toHaveBeenCalled();
  });

  it('F11 ignores forged X-Forwarded-For for direct sockets and selects the nearest untrusted hop for loopback proxy', async () => {
    const express = app.getHttpAdapter().getInstance();
    const enforce = vi.spyOn(rateLimiter, 'enforce').mockResolvedValue({ maxRequests: 5, remaining: 4 } as any);
    try {
      express.set('trust proxy', false);
      await request(app.getHttpServer()).post('/api/auth/login')
        .set('X-Forwarded-For', '198.51.100.1, 203.0.113.1')
        .set('X-Captcha-Token', 'mock-valid-turnstile-token')
        .send({ email, password }).expect(200);
      const directIp = enforce.mock.calls.at(-1)?.[1];
      expect(directIp).not.toMatch(/198\.51\.100\.1|203\.0\.113\.1/);

      express.set('trust proxy', ['loopback']);
      await request(app.getHttpServer()).post('/api/auth/login')
        .set('X-Forwarded-For', '198.51.100.1, 203.0.113.1')
        .set('X-Captcha-Token', 'mock-valid-turnstile-token')
        .send({ email, password }).expect(200);
      expect(enforce.mock.calls.at(-1)?.[1]).toBe('203.0.113.1');
    } finally {
      express.set('trust proxy', ['loopback']);
      enforce.mockRestore();
    }
  });

  describe('POST /api/contacts protection', () => {
    const validContact = {
      fullName: 'Khách hàng thử nghiệm',
      companyName: 'Công ty Thử Nghiệm',
      email: 'visitor@example.com',
      phone: '+84912345678',
      requestType: 'product_consultation',
      message: 'Yêu cầu tư vấn thiết bị phân tích.',
    };

    it('rejects contact submission when CAPTCHA is missing and creates 0 DB rows', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/contacts')
        .send(validContact)
        .expect(400);

      expect(res.body.message).toContain('CAPTCHA');
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('rejects contact submission when CAPTCHA is invalid and creates 0 DB rows', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/contacts')
        .set('X-Captcha-Token', 'mock-invalid-turnstile-token')
        .send(validContact)
        .expect(400);

      expect(res.body.message).toContain('không hợp lệ');
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('accepts contact submission when CAPTCHA is valid and creates contact', async () => {
      await request(app.getHttpServer())
        .post('/api/contacts')
        .set('X-Captcha-Token', 'mock-valid-turnstile-token')
        .send(validContact)
        .expect(202);

      expect(mockInsert).toHaveBeenCalled();
    });

    it('enforces distributed rate limiting on /api/contacts returning 429 and Retry-After', async () => {
      // Consume up to limit = 2
      const ip = '198.51.100.55';
      await rateLimiter.consume('contacts:submit', ip, 2, 60);
      await rateLimiter.consume('contacts:submit', ip, 2, 60);

      const res = await request(app.getHttpServer())
        .post('/api/contacts')
        .set('X-Forwarded-For', ip)
        .set('X-Captcha-Token', 'mock-valid-turnstile-token')
        .send(validContact)
        .expect(429);

      expect(res.body.error).toBe('Too Many Requests');
      expect(res.headers['retry-after']).toBeDefined();
    });
  });

  describe('POST /api/auth/login protection', () => {
    it('rejects login when CAPTCHA is missing without comparing passwords', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password })
        .expect(400);

      expect(res.body.message).toContain('CAPTCHA');
      expect(mockUsersFindFirst).not.toHaveBeenCalled();
    });

    it('rejects login when CAPTCHA is invalid without comparing passwords', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Captcha-Token', 'mock-invalid-turnstile-token')
        .send({ email, password })
        .expect(400);

      expect(res.body.message).toContain('không hợp lệ');
      expect(mockUsersFindFirst).not.toHaveBeenCalled();
    });

    it('accepts valid credentials with valid CAPTCHA', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Captcha-Token', 'mock-valid-turnstile-token')
        .send({ email, password })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
    });

    it('enforces distributed rate limit returning 429 when max login attempts reached', async () => {
      const ip = '198.51.100.88';
      await rateLimiter.consume('auth:login', ip, 3, 60);
      await rateLimiter.consume('auth:login', ip, 3, 60);
      await rateLimiter.consume('auth:login', ip, 3, 60);

      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Forwarded-For', ip)
        .set('X-Captcha-Token', 'mock-valid-turnstile-token')
        .send({ email, password })
        .expect(429);

      expect(res.body.error).toBe('Too Many Requests');
      expect(res.headers['retry-after']).toBeDefined();
    });

    it('fails closed with HTTP 503 and executes 0 operations if rate limiter DB fails', async () => {
      vi.spyOn(rateLimiter, 'enforce').mockRejectedValueOnce(
        new HttpException(
          { statusCode: 503, error: 'Service Unavailable', message: 'Dịch vụ bảo vệ tạm thời không khả dụng. Vui lòng thử lại sau ít phút.' },
          HttpStatus.SERVICE_UNAVAILABLE,
        )
      );

      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Captcha-Token', 'mock-valid-turnstile-token')
        .send({ email, password })
        .expect(503);

      expect(res.body.error).toBe('Service Unavailable');
      expect(mockUsersFindFirst).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/forgot-password protection', () => {
    it('rejects forgot-password when CAPTCHA is missing and creates 0 reset tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email })
        .expect(400);

      expect(res.body.message).toContain('CAPTCHA');
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('accepts forgot-password with valid CAPTCHA and returns generic response', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .set('X-Captcha-Token', 'mock-valid-turnstile-token')
        .send({ email })
        .expect(202);

      expect(res.body.message).toContain('Nếu tài khoản');
    });

    it('enforces distributed rate limiting on forgot-password', async () => {
      const ip = '198.51.100.99';
      await rateLimiter.consume('auth:forgot-password', ip, 2, 60);
      await rateLimiter.consume('auth:forgot-password', ip, 2, 60);

      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .set('X-Forwarded-For', ip)
        .set('X-Captcha-Token', 'mock-valid-turnstile-token')
        .send({ email })
        .expect(429);
    });
  });

  describe('POST /api/auth/reset-password protection', () => {
    it('enforces distributed rate limiting on reset-password endpoint', async () => {
      const ip = '198.51.100.111';
      await rateLimiter.consume('auth:reset-password', ip, 2, 60);
      await rateLimiter.consume('auth:reset-password', ip, 2, 60);

      const res = await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .set('X-Forwarded-For', ip)
        .send({ token: 'test-token', newPassword: 'NewPassword123!@#' })
        .expect(429);

      expect(res.body.error).toBe('Too Many Requests');
      expect(res.headers['retry-after']).toBeDefined();
    });
  });
});
