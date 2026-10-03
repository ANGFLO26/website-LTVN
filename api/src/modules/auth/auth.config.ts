import type { ConfigService } from '@nestjs/config';
import type { JwtModuleOptions } from '@nestjs/jwt';

export function authJwtOptions(config: ConfigService): JwtModuleOptions {
  const secret = config.get<string>('JWT_SECRET');
  const ttl = config.get<string>('JWT_TTL_SECONDS');
  if (typeof secret !== 'string' || Buffer.byteLength(secret.trim(), 'utf8') < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 bytes.');
  }
  if (typeof ttl !== 'string' || !/^[1-9]\d*$/.test(ttl) || Number(ttl) > 86400) {
    throw new Error('JWT_TTL_SECONDS must be an integer from 1 to 86400.');
  }
  return {
    secret,
    signOptions: {
      algorithm: 'HS256',
      expiresIn: Number(ttl),
      issuer: 'ltvn-api',
      audience: 'ltvn-admin',
    },
    verifyOptions: {
      algorithms: ['HS256'],
      issuer: 'ltvn-api',
      audience: 'ltvn-admin',
    },
  };
}

export interface LockoutPolicy {
  maxFailedAttempts: number;
  lockoutDurationMs: number;
}

export function getLockoutPolicy(config?: { get: (key: string) => unknown }): LockoutPolicy {
  const rawMax = config?.get('AUTH_MAX_FAILED_ATTEMPTS') ?? process.env.AUTH_MAX_FAILED_ATTEMPTS;
  const rawMinutes = config?.get('AUTH_LOCKOUT_MINUTES') ?? process.env.AUTH_LOCKOUT_MINUTES;

  let maxFailedAttempts = 5;
  if (rawMax !== undefined && rawMax !== null) {
    const str = typeof rawMax === 'string' ? rawMax.trim() : typeof rawMax === 'number' ? String(rawMax) : '';
    if (str !== '') {
      const parsed = Number(str);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error('AUTH_MAX_FAILED_ATTEMPTS must be an integer greater than 0.');
      }
      maxFailedAttempts = parsed;
    }
  }

  let lockoutMinutes = 15;
  if (rawMinutes !== undefined && rawMinutes !== null) {
    const str = typeof rawMinutes === 'string' ? rawMinutes.trim() : typeof rawMinutes === 'number' ? String(rawMinutes) : '';
    if (str !== '') {
      const parsed = Number(str);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error('AUTH_LOCKOUT_MINUTES must be an integer greater than 0.');
      }
      lockoutMinutes = parsed;
    }
  }

  return {
    maxFailedAttempts,
    lockoutDurationMs: lockoutMinutes * 60 * 1000,
  };
}

export interface PasswordValidationResult {
  valid: boolean;
  message?: string;
}

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 72;

export function validatePasswordStrength(password: unknown): PasswordValidationResult {
  if (typeof password !== 'string') {
    return { valid: false, message: 'Mật khẩu phải là chuỗi ký tự.' };
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, message: `Mật khẩu phải có độ dài tối thiểu ${PASSWORD_MIN_LENGTH} ký tự.` };
  }
  if (password.length > PASSWORD_MAX_LENGTH || Buffer.byteLength(password, 'utf8') > 72) {
    return { valid: false, message: 'Mật khẩu không được vượt quá 72 ký tự.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Mật khẩu phải chứa ít nhất một chữ cái in hoa (A-Z).' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Mật khẩu phải chứa ít nhất một chữ cái thường (a-z).' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Mật khẩu phải chứa ít nhất một chữ số (0-9).' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: 'Mật khẩu phải chứa ít nhất một ký tự đặc biệt (!@#$%^&*...).' };
  }
  return { valid: true };
}


