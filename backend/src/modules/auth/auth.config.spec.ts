import { randomBytes } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import {
  authJwtOptions,
  getAdminPublicUrl,
  getLockoutPolicy,
  getPasswordResetTokenTtlMinutes,
  validatePasswordStrength,
} from './auth.config.js';

function config(values: Record<string, string | undefined>) {
  const service = new ConfigService();
  vi.spyOn(service, 'get').mockImplementation((key: string) => values[key]);
  return service;
}

describe('Admin JWT configuration', () => {
  it('uses the configured secret, expiry and restricted algorithm', () => {
    const secret = randomBytes(48).toString('base64url');
    const options = authJwtOptions(config({ JWT_SECRET: secret, JWT_TTL_SECONDS: '900' }));
    expect(options.secret).toBe(secret);
    expect(options.signOptions).toMatchObject({ expiresIn: 900, algorithm: 'HS256' });
    expect(options.verifyOptions).toMatchObject({ algorithms: ['HS256'], issuer: 'ltvn-api', audience: 'ltvn-admin' });
  });

  it.each([undefined, '', 'short'])('fails closed for missing/weak secret (%s)', (secret) => {
    expect(() => authJwtOptions(config({ JWT_SECRET: secret, JWT_TTL_SECONDS: '900' }))).toThrow('JWT_SECRET');
  });

  it.each([undefined, '', '0', '-1', '1.5', '1h', '86401'])('rejects invalid lifetime (%s)', (ttl) => {
    expect(() => authJwtOptions(config({ JWT_SECRET: randomBytes(48).toString('base64url'), JWT_TTL_SECONDS: ttl }))).toThrow('JWT_TTL_SECONDS');
  });
});

describe('PR-04A Lockout Policy Configuration', () => {
  it('uses default values (5 attempts, 15 minutes) when env is not set', () => {
    const policy = getLockoutPolicy(config({}));
    expect(policy.maxFailedAttempts).toBe(5);
    expect(policy.lockoutDurationMs).toBe(15 * 60 * 1000);
  });

  it('uses valid custom values', () => {
    const policy = getLockoutPolicy(config({
      AUTH_MAX_FAILED_ATTEMPTS: '3',
      AUTH_LOCKOUT_MINUTES: '30',
    }));
    expect(policy.maxFailedAttempts).toBe(3);
    expect(policy.lockoutDurationMs).toBe(30 * 60 * 1000);
  });

  it.each(['0', '-1', '-5', 'abc', '1.5', 'NaN'])('rejects invalid AUTH_MAX_FAILED_ATTEMPTS (%s)', (val) => {
    expect(() => getLockoutPolicy(config({ AUTH_MAX_FAILED_ATTEMPTS: val }))).toThrow('AUTH_MAX_FAILED_ATTEMPTS');
  });

  it.each(['0', '-1', '-10', 'xyz', '2.5', 'NaN'])('rejects invalid AUTH_LOCKOUT_MINUTES (%s)', (val) => {
    expect(() => getLockoutPolicy(config({ AUTH_LOCKOUT_MINUTES: val }))).toThrow('AUTH_LOCKOUT_MINUTES');
  });
});

describe('PR-10A Password Policy Validation', () => {
  it('accepts strong password meeting all criteria', () => {
    const res = validatePasswordStrength('StrongPass#2026');
    expect(res.valid).toBe(true);
    expect(res.message).toBeUndefined();
  });

  it('rejects passwords shorter than 12 characters', () => {
    const res = validatePasswordStrength('Short#1Aa');
    expect(res.valid).toBe(false);
    expect(res.message).toContain('12 ký tự');
  });

  it('rejects passwords without uppercase letters', () => {
    const res = validatePasswordStrength('lowercase_only_123#');
    expect(res.valid).toBe(false);
    expect(res.message).toContain('in hoa');
  });

  it('rejects passwords without lowercase letters', () => {
    const res = validatePasswordStrength('UPPERCASE_ONLY_123#');
    expect(res.valid).toBe(false);
    expect(res.message).toContain('chữ cái thường');
  });

  it('rejects passwords without numbers', () => {
    const res = validatePasswordStrength('NoNumbersHereSpecial!');
    expect(res.valid).toBe(false);
    expect(res.message).toContain('chữ số');
  });

  it('rejects passwords without special characters', () => {
    const res = validatePasswordStrength('NoSpecialChars1234');
    expect(res.valid).toBe(false);
    expect(res.message).toContain('ký tự đặc biệt');
  });

  it('rejects non-string input', () => {
    expect(validatePasswordStrength(null).valid).toBe(false);
    expect(validatePasswordStrength(123456789012).valid).toBe(false);
  });
});

describe('PR-10B Password Reset Configuration', () => {
  it('uses default 30 minutes TTL when env is unset', () => {
    expect(getPasswordResetTokenTtlMinutes(config({}))).toBe(30);
  });

  it('uses valid custom TTL', () => {
    expect(getPasswordResetTokenTtlMinutes(config({ AUTH_PASSWORD_RESET_TOKEN_TTL_MINUTES: '60' }))).toBe(60);
  });

  it.each(['0', '-5', 'abc', '1.5'])('rejects invalid TTL values (%s)', (val) => {
    expect(() => getPasswordResetTokenTtlMinutes(config({ AUTH_PASSWORD_RESET_TOKEN_TTL_MINUTES: val }))).toThrow(
      'AUTH_PASSWORD_RESET_TOKEN_TTL_MINUTES',
    );
  });

  it('falls back to correct Admin dev origin (http://localhost:5174) in development when missing', () => {
    expect(getAdminPublicUrl(config({ NODE_ENV: 'development' }))).toBe('http://localhost:5174');
    expect(getAdminPublicUrl(config({}))).toBe('http://localhost:5174');
  });

  it('fails closed in production if ADMIN_PUBLIC_URL is missing', () => {
    expect(() => getAdminPublicUrl(config({ NODE_ENV: 'production' }))).toThrow(
      'ADMIN_PUBLIC_URL environment variable is required in production.',
    );
  });

  it('accepts valid https origin and normalized subpath without trailing slash', () => {
    expect(getAdminPublicUrl(config({ ADMIN_PUBLIC_URL: 'https://admin.example.com' }))).toBe('https://admin.example.com');
    expect(getAdminPublicUrl(config({ ADMIN_PUBLIC_URL: 'https://admin.example.com/' }))).toBe('https://admin.example.com');
    expect(getAdminPublicUrl(config({ ADMIN_PUBLIC_URL: 'https://example.com/admin/' }))).toBe('https://example.com/admin');
    expect(getAdminPublicUrl(config({ ADMIN_PUBLIC_URL: 'http://localhost:5174' }))).toBe('http://localhost:5174');
  });

  it('rejects credentials in ADMIN_PUBLIC_URL', () => {
    expect(() => getAdminPublicUrl(config({ ADMIN_PUBLIC_URL: 'https://user:pass@admin.example.com' }))).toThrow(
      'ADMIN_PUBLIC_URL must not contain authentication credentials.',
    );
  });

  it('rejects query parameters in ADMIN_PUBLIC_URL', () => {
    expect(() => getAdminPublicUrl(config({ ADMIN_PUBLIC_URL: 'https://admin.example.com?query=1' }))).toThrow(
      'ADMIN_PUBLIC_URL must not contain query parameters or fragments.',
    );
  });

  it('rejects hash / fragments in ADMIN_PUBLIC_URL', () => {
    expect(() => getAdminPublicUrl(config({ ADMIN_PUBLIC_URL: 'https://admin.example.com#section' }))).toThrow(
      'ADMIN_PUBLIC_URL must not contain query parameters or fragments.',
    );
  });

  it.each([
    'ftp://admin.example.com',
    'javascript:alert(1)',
    'data:text/html,test',
    'file:///etc/passwd',
    'not-a-valid-url',
  ])('rejects invalid protocol or malformed URL (%s)', (url) => {
    expect(() => getAdminPublicUrl(config({ ADMIN_PUBLIC_URL: url }))).toThrow('ADMIN_PUBLIC_URL');
  });
});
