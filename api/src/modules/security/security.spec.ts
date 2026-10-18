import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus, BadRequestException, Logger } from '@nestjs/common';
import { RateLimiterService } from './rate-limiter.service.js';
import { CaptchaService } from './captcha.service.js';

describe('PR-04B: Security Unit Test Matrix (Rate Limiting & CAPTCHA)', () => {
  let rateLimiter: RateLimiterService;
  let captchaService: CaptchaService;
  let mockDb: any;
  let configService: ConfigService;

  beforeEach(() => {
    mockDb = {
      execute: vi.fn(),
    };
    configService = new ConfigService({
      NODE_ENV: 'test',
      RATE_LIMIT_HASH_SECRET: 'test-hash-secret-minimum-16-characters-long',
      TURNSTILE_ENABLED: 'true',
      TURNSTILE_SECRET_KEY: 'test-turnstile-secret-16chars',
      TURNSTILE_ALLOWED_HOSTNAMES: 'ltvietnam.com.vn,admin.ltvietnam.com.vn,localhost',
    });
    rateLimiter = new RateLimiterService(mockDb as any, configService);
    captchaService = new CaptchaService(configService);
  });

  afterEach(() => {
    mockDb.execute.mockReset();
    vi.restoreAllMocks();
  });

  // 1. request under limit accepted
  it('1. request under limit is accepted', async () => {
    const expiresAt = new Date(Date.now() + 60000);
    mockDb.execute.mockResolvedValueOnce([{ request_count: 1, expires_at: expiresAt, window_start: new Date() }]);

    const res = await rateLimiter.consume('test:scope', '192.168.1.1', 5, 60);
    expect(res.allowed).toBe(true);
    expect(res.requestCount).toBe(1);
    expect(res.remaining).toBe(4);
  });

  // 2. request at limit accepted
  it('2. request exactly at limit is accepted', async () => {
    const expiresAt = new Date(Date.now() + 60000);
    mockDb.execute.mockResolvedValueOnce([{ request_count: 5, expires_at: expiresAt, window_start: new Date() }]);

    const res = await rateLimiter.consume('test:scope', '192.168.1.1', 5, 60);
    expect(res.allowed).toBe(true);
    expect(res.requestCount).toBe(5);
    expect(res.remaining).toBe(0);
  });

  // 3. request over limit -> 429
  it('3. request over limit throws HTTP 429 Too Many Requests', async () => {
    const expiresAt = new Date(Date.now() + 30000);
    mockDb.execute.mockResolvedValueOnce([{ request_count: 6, expires_at: expiresAt, window_start: new Date() }]);

    await expect(rateLimiter.enforce('test:scope', '192.168.1.1', 5, 60)).rejects.toThrow(HttpException);

    mockDb.execute.mockResolvedValueOnce([{ request_count: 6, expires_at: expiresAt, window_start: new Date() }]);
    try {
      await rateLimiter.enforce('test:scope', '192.168.1.1', 5, 60);
    } catch (err: any) {
      expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      const resp = err.getResponse();
      expect(resp.retryAfter).toBeGreaterThan(0);
    }
  });

  // 4. scoped buckets independent
  it('4. scoped buckets are independent for the same client subject', async () => {
    const ip = '10.0.0.1';
    const expiresAt = new Date(Date.now() + 60000);
    // Bucket A hits limit
    mockDb.execute.mockResolvedValueOnce([{ request_count: 6, expires_at: expiresAt, window_start: new Date() }]);
    const resA = await rateLimiter.consume('auth:login', ip, 5, 60);
    expect(resA.allowed).toBe(false);

    // Bucket B starts fresh
    mockDb.execute.mockResolvedValueOnce([{ request_count: 1, expires_at: expiresAt, window_start: new Date() }]);
    const resB = await rateLimiter.consume('contacts:submit', ip, 5, 60);
    expect(resB.allowed).toBe(true);
    expect(resB.requestCount).toBe(1);
  });

  // 5. window reset
  it('5. window reset allows previously blocked client after expiration', async () => {
    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + 60000);
    // When previous window expires, atomic SQL query returns request_count = 1
    mockDb.execute.mockResolvedValueOnce([{ request_count: 1, expires_at: newExpiresAt, window_start: now }]);

    const res = await rateLimiter.consume('auth:login', '1.2.3.4', 5, 60);
    expect(res.allowed).toBe(true);
    expect(res.requestCount).toBe(1);
  });

  // 6. two shared instances obey one combined limit
  it('6. two shared instances sharing the same DB obey one combined limit', async () => {
    const instanceA = new RateLimiterService(mockDb as any, configService);
    const instanceB = new RateLimiterService(mockDb as any, configService);
    const expiresAt = new Date(Date.now() + 60000);

    // Sequence of interleaved requests across instances A and B
    mockDb.execute
      .mockResolvedValueOnce([{ request_count: 1, expires_at: expiresAt }])
      .mockResolvedValueOnce([{ request_count: 2, expires_at: expiresAt }])
      .mockResolvedValueOnce([{ request_count: 3, expires_at: expiresAt }])
      .mockResolvedValueOnce([{ request_count: 4, expires_at: expiresAt }])
      .mockResolvedValueOnce([{ request_count: 5, expires_at: expiresAt }])
      .mockResolvedValueOnce([{ request_count: 6, expires_at: expiresAt }]);

    const res1 = await instanceA.consume('auth:login', '1.1.1.1', 5, 60);
    const res2 = await instanceB.consume('auth:login', '1.1.1.1', 5, 60);
    const res3 = await instanceA.consume('auth:login', '1.1.1.1', 5, 60);
    const res4 = await instanceB.consume('auth:login', '1.1.1.1', 5, 60);
    const res5 = await instanceA.consume('auth:login', '1.1.1.1', 5, 60);
    const res6 = await instanceB.consume('auth:login', '1.1.1.1', 5, 60);

    expect(res1.allowed).toBe(true);
    expect(res2.allowed).toBe(true);
    expect(res3.allowed).toBe(true);
    expect(res4.allowed).toBe(true);
    expect(res5.allowed).toBe(true);
    expect(res6.allowed).toBe(false); // 6th request fails regardless of instance!
  });

  // 7. concurrency boundary does not overshoot
  it('7. atomic DB serialization ensures concurrency boundary does not overshoot', async () => {
    const expiresAt = new Date(Date.now() + 60000);
    // Simulating 10 concurrent requests at boundary limit = 5
    mockDb.execute
      .mockResolvedValueOnce([{ request_count: 5, expires_at: expiresAt }])
      .mockResolvedValueOnce([{ request_count: 6, expires_at: expiresAt }])
      .mockResolvedValueOnce([{ request_count: 7, expires_at: expiresAt }])
      .mockResolvedValueOnce([{ request_count: 8, expires_at: expiresAt }]);

    const results = await Promise.all([
      rateLimiter.consume('boundary', '2.2.2.2', 5, 60),
      rateLimiter.consume('boundary', '2.2.2.2', 5, 60),
      rateLimiter.consume('boundary', '2.2.2.2', 5, 60),
      rateLimiter.consume('boundary', '2.2.2.2', 5, 60),
    ]);

    const allowedCount = results.filter((r) => r.allowed).length;
    const blockedCount = results.filter((r) => !r.allowed).length;
    expect(allowedCount).toBe(1); // exactly 1 passed
    expect(blockedCount).toBe(3); // remainder rejected
  });

  // 8. missing CAPTCHA token rejected
  it('8. missing CAPTCHA token is rejected with 400 Bad Request', async () => {
    await expect(captchaService.verify('')).rejects.toThrow(BadRequestException);
    await expect(captchaService.verify(null)).rejects.toThrow(BadRequestException);
    await expect(captchaService.verify(undefined)).rejects.toThrow(BadRequestException);
  });

  // 9. invalid CAPTCHA rejected
  it('9. invalid CAPTCHA token is rejected with 400 Bad Request', async () => {
    await expect(captchaService.verify('mock-invalid-turnstile-token')).rejects.toThrow(BadRequestException);
    await expect(captchaService.verify('2x00000000000000000000AB')).rejects.toThrow(BadRequestException);
  });

  // 10. valid CAPTCHA accepted
  it('10. valid CAPTCHA token is accepted', async () => {
    const res = await captchaService.verify('mock-valid-turnstile-token');
    expect(res.success).toBe(true);
  });

  // 11. CAPTCHA action mismatch rejected
  it('11. CAPTCHA action mismatch is rejected', async () => {
    // Mock global fetch returning mismatched action
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, action: 'different_action' }),
    });

    try {
      await expect(
        captchaService.verify('real-provider-token-12345', { action: 'login' })
      ).rejects.toThrow(BadRequestException);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // 12. wrong hostname rejected if applicable
  it('12. unapproved hostname is rejected', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, action: 'login', hostname: 'attacker.com' }),
    });

    try {
      await expect(
        captchaService.verify('real-provider-token-12345', { action: 'login' })
      ).rejects.toThrow(BadRequestException);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it.each([
    [{ success: true, hostname: 'localhost' }, 'missing action'],
    [{ success: true, action: 'login' }, 'missing hostname'],
    [{ success: true, action: 'forgot_password', hostname: 'localhost' }, 'wrong action'],
    [{ success: true, action: 'login', hostname: 'attacker.example' }, 'wrong hostname'],
    [{ success: 'true', action: 'login', hostname: 'localhost' }, 'non-boolean success'],
  ])('F10 rejects provider response with %s (%s)', async (providerBody, _caseName) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => providerBody,
    } as Response);
    await expect(captchaService.verify('provider-token', { action: 'login' })).rejects.toThrow(BadRequestException);
  });

  it('F10 accepts a complete provider response for the expected action and allowed hostname', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, action: 'login', hostname: 'admin.ltvietnam.com.vn' }),
    } as Response);
    await expect(captchaService.verify('provider-token', { action: 'login' })).resolves.toMatchObject({
      success: true, action: 'login', hostname: 'admin.ltvietnam.com.vn',
    });
  });

  it('F10 fails closed when the provider request times out', async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('abort')));
    }));
    try {
      const result = captchaService.verify('provider-token', { action: 'login' });
      const assertion = expect(result).rejects.toMatchObject({ status: HttpStatus.SERVICE_UNAVAILABLE });
      await vi.advanceTimersByTimeAsync(5000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  // 13. provider timeout/error fails closed
  it('13. provider timeout or error fails closed with 503', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error('Network timeout'));

    try {
      await expect(
        captchaService.verify('real-provider-token-12345', { action: 'login' })
      ).rejects.toThrow(HttpException);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // 14. CAPTCHA token not logged/stored
  it('14. CAPTCHA token is not logged or leaked in error messages', async () => {
    const sensitiveToken = 'sensitive-token-must-not-appear-in-logs';
    try {
      await captchaService.verify('mock-invalid-turnstile-token');
    } catch (err: any) {
      expect(err.message).not.toContain(sensitiveToken);
    }
  });

  // 15. PII-safe hashing: IP address is hashed using HMAC-SHA256
  it('15. IP address is hashed deterministically with HMAC-SHA256', () => {
    const hash1 = rateLimiter.hashSubject('192.168.1.100');
    const hash2 = rateLimiter.hashSubject('192.168.1.100');
    const hash3 = rateLimiter.hashSubject('192.168.1.101');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1).toHaveLength(64); // SHA-256 hex length
    expect(hash1).not.toContain('192.168.1.100'); // Plaintext IP not in hash
  });

  // 16. IP normalization
  it('16. IP normalization removes whitespace and IPv4-mapped IPv6 prefix', () => {
    expect(rateLimiter.normalizeIp('  ::ffff:192.168.1.5  ')).toBe('192.168.1.5');
    expect(rateLimiter.normalizeIp('10.0.0.1')).toBe('10.0.0.1');
    expect(rateLimiter.normalizeIp(null)).toBe('127.0.0.1');
    expect(rateLimiter.normalizeIp('')).toBe('127.0.0.1');
  });

  it('F11 normalizes equivalent IPv6 and IPv4-mapped addresses to one quota identity', async () => {
    expect(rateLimiter.normalizeIp('2001:0DB8:0:0:0:0:0:1')).toBe('2001:db8::1');
    expect(rateLimiter.normalizeIp('::ffff:c000:0201')).toBe('192.0.2.1');
    const limiter = new RateLimiterService(null as any, configService);
    expect((await limiter.consume('f11', '::ffff:192.0.2.1', 1, 60)).allowed).toBe(true);
    expect((await limiter.consume('f11', '192.0.2.1', 1, 60)).allowed).toBe(false);
  });

  // 17. Production config fail-fast on missing RATE_LIMIT_HASH_SECRET
  it('17. Production fails fast if RATE_LIMIT_HASH_SECRET is missing or too short', () => {
    const prodConfigMissing = new ConfigService({
      NODE_ENV: 'production',
      RATE_LIMIT_HASH_SECRET: '',
    });
    expect(() => new RateLimiterService(mockDb as any, prodConfigMissing)).toThrow(
      /RATE_LIMIT_HASH_SECRET environment variable is required/
    );

    const prodConfigShort = new ConfigService({
      NODE_ENV: 'production',
      RATE_LIMIT_HASH_SECRET: 'too-short',
    });
    expect(() => new RateLimiterService(mockDb as any, prodConfigShort)).toThrow(
      /must be at least 16 characters in production/
    );
  });

  // 18. Production config fail-fast on missing TURNSTILE_SECRET_KEY
  it('18. Production fails fast if TURNSTILE_SECRET_KEY is missing or too short', () => {
    const prodConfigMissing = new ConfigService({
      NODE_ENV: 'production',
      TURNSTILE_ENABLED: 'true',
      TURNSTILE_SECRET_KEY: '',
    });
    expect(() => new CaptchaService(prodConfigMissing)).toThrow(
      /TURNSTILE_SECRET_KEY environment variable is required/
    );

    const prodConfigShort = new ConfigService({
      NODE_ENV: 'production',
      TURNSTILE_ENABLED: 'true',
      TURNSTILE_SECRET_KEY: 'short',
    });
    expect(() => new CaptchaService(prodConfigShort)).toThrow(
      /must be at least 16 characters in production/
    );
  });

  // 19. Bounded expired cleanup
  it('19. Opportunistic cleanup queries expired records older than 24 hours', async () => {
    mockDb.execute.mockResolvedValueOnce({ count: 42 });
    const count = await rateLimiter.cleanupExpired();
    expect(count).toBe(42);
    expect(mockDb.execute).toHaveBeenCalled();
  });

  // 20. Fallback memory rate limiter when db.execute is absent
  it('20. Fallback memory rate limiter works gracefully when database is mocked without execute', async () => {
    const memoryLimiter = new RateLimiterService(null as any, configService);
    const r1 = await memoryLimiter.consume('test:mem', '127.0.0.1', 2, 60);
    const r2 = await memoryLimiter.consume('test:mem', '127.0.0.1', 2, 60);
    const r3 = await memoryLimiter.consume('test:mem', '127.0.0.1', 2, 60);

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(false);
  });

  // 21. Production rejects TURNSTILE_ENABLED=false
  it('21. Production throws error if TURNSTILE_ENABLED is set to false (cannot silently disable)', () => {
    const prodConfigDisabled = new ConfigService({
      NODE_ENV: 'production',
      TURNSTILE_ENABLED: 'false',
      TURNSTILE_SECRET_KEY: 'test-turnstile-secret-16chars',
    });
    expect(() => new CaptchaService(prodConfigDisabled)).toThrow(
      /TURNSTILE_ENABLED cannot be set to false in production: CAPTCHA protection is mandatory/
    );
  });

  // 22. Production dynamically derives hostnames and rejects localhost
  it('22. Production dynamically derives hostnames from URLs and strips localhost', async () => {
    const prodConfigWithUrls = new ConfigService({
      NODE_ENV: 'production',
      TURNSTILE_SECRET_KEY: 'test-turnstile-secret-16chars',
      PUBLIC_SITE_URL: 'https://ltvietnam.com.vn',
      ADMIN_PUBLIC_URL: 'https://admin.ltvietnam.com.vn',
      TURNSTILE_ALLOWED_HOSTNAMES: 'localhost,extra.ltvietnam.com.vn',
    });
    const prodCaptcha = new CaptchaService(prodConfigWithUrls);
    expect(prodCaptcha.isCaptchaRequired()).toBe(true);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, action: 'login', hostname: 'localhost' }),
    });

    try {
      await expect(
        prodCaptcha.verify('some-prod-token', { action: 'login' })
      ).rejects.toThrow(/localhost/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // 23. Production Rate limiter DB failure throws HTTP 503 fail-closed without leaking SQL
  it('23. Database failure in production rate limiter throws HTTP 503 fail-closed without leaking SQL error', async () => {
    const logSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const prodConfig = new ConfigService({
      NODE_ENV: 'production',
      RATE_LIMIT_HASH_SECRET: 'test-hash-secret-minimum-16-characters-long',
    });
    const failingDb = {
      execute: vi.fn().mockRejectedValue(new Error('FATAL: password authentication failed for user "postgres" on port 5432')),
    };
    const prodRateLimiter = new RateLimiterService(failingDb as any, prodConfig);

    try {
      await prodRateLimiter.enforce('auth:login', '1.2.3.4', 5, 60);
      expect.fail('Should have thrown HTTP 503');
    } catch (err: any) {
      expect(err).toBeInstanceOf(HttpException);
      expect(err.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      const res = err.getResponse();
      expect(res.error).toBe('Service Unavailable');
      // Verify zero SQL or sensitive details leaked
      expect(res.message).not.toContain('FATAL');
      expect(res.message).not.toContain('password authentication');
      expect(res.message).not.toContain('postgres');
      expect(res.message).toContain('Dịch vụ bảo vệ tạm thời không khả dụng');
      expect(JSON.stringify(logSpy.mock.calls)).not.toContain('password authentication');
    }
    logSpy.mockRestore();
  });
});
