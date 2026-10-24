import { randomBytes, randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcryptjs';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { DRIZZLE } from '../src/database/database.module.js';
import type { users } from '../src/database/schema.js';
import { UsersService } from '../src/modules/users/users.service.js';
import { MachinesService } from '../src/modules/machines/machines.service.js';
import { NewsEventsService } from '../src/modules/news-events/news-events.service.js';
import { ContactsService } from '../src/modules/contacts/contacts.service.js';
import {
  validatePassword,
  validateEmail,
} from '../../scripts/bootstrap-admin.mjs';

type Account = typeof users.$inferSelect;

describe('PR-05: Safe Initial Admin Bootstrap E2E Contract', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;
  const adminId = randomUUID();
  const adminEmail = `initial-admin-${randomUUID()}@ltvietnam.com.vn`;
  const adminPassword = 'BootstrapSuperP@ssw0rd2026!';
  const jwtSecret = randomBytes(48).toString('base64url');

  let bootstrappedAccount: Account;
  const findFirst = vi.fn<() => Promise<Account | undefined>>();
  const updateWhere = vi.fn().mockResolvedValue([]);
  const updateSet = vi.fn().mockImplementation((_updates: Record<string, unknown>) => {
    return { where: updateWhere };
  });
  const update = vi.fn().mockReturnValue({ set: updateSet });

  beforeAll(async () => {
    // Generate valid bcrypt hash matching bootstrap implementation (cost factor 10)
    const passwordHash = await hash(adminPassword, 10);
    bootstrappedAccount = {
      id: adminId,
      email: adminEmail,
      fullName: 'Quản Trị Viên Hệ Thống Khởi Tạo',
      passwordHash,
      tokenVersion: 0,
      role: 'admin',
      status: 'active',
      deletedAt: null,
      lastLoginAt: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService).useValue(new ConfigService({
        JWT_SECRET: jwtSecret,
        JWT_TTL_SECONDS: '3600',
        RATE_LIMIT_HASH_SECRET: 'test-hash-secret-pr05-min16chars',
        TURNSTILE_SECRET_KEY: 'test-turnstile-secret',
      }))
      .overrideProvider(DRIZZLE).useValue({
        query: { users: { findFirst } },
        update,
        execute: vi.fn().mockResolvedValue([]),
      })
      .overrideProvider(UsersService).useValue({ findAll: () => [{ id: adminId }] })
      .overrideProvider(MachinesService).useValue({ findAll: () => [], findPublished: () => [] })
      .overrideProvider(NewsEventsService).useValue({ findAll: () => [], findPublished: () => [] })
      .overrideProvider(ContactsService).useValue({ findAll: () => [], create: vi.fn() })
      .compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    jwt = module.get(JwtService);
  });

  beforeEach(() => {
    findFirst.mockReset().mockResolvedValue(bootstrappedAccount);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Password Policy & Input Validation', () => {
    it('validates minimum length 12 and maximum length 72', () => {
      expect(validatePassword('Short1!Aa').valid).toBe(false);
      expect(validatePassword('A'.repeat(73) + '1!a').valid).toBe(false);
      expect(validatePassword(adminPassword).valid).toBe(true);
    });

    it('requires uppercase, lowercase, number, and special character', () => {
      expect(validatePassword('alllower12345!@#').valid).toBe(false);
      expect(validatePassword('ALLUPPER12345!@#').valid).toBe(false);
      expect(validatePassword('NoSpecialChar12345').valid).toBe(false);
      expect(validatePassword('NoNumbersSpecial!@#').valid).toBe(false);
    });

    it('validates email format', () => {
      expect(validateEmail('admin@ltvietnam.com.vn')).toBe(true);
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('2. Login & Authentication of Bootstrapped Admin', () => {
    it('successfully logs in with bootstrapped admin credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Captcha-Token', 'mock-valid-turnstile-token')
        .send({ email: adminEmail, password: adminPassword })
        .expect(200);

      const body = res.body;
      expect(body.tokenType).toBe('Bearer');
      expect(typeof body.accessToken).toBe('string');
      expect(body.user).toEqual({
        id: adminId,
        email: adminEmail,
        fullName: 'Quản Trị Viên Hệ Thống Khởi Tạo',
        role: 'admin',
      });
      // Zero passwordHash exposure in response
      expect(JSON.stringify(body)).not.toContain('passwordHash');

      // Verify JWT signature and claims
      const claims = jwt.verify<{ sub: string }>(body.accessToken);
      expect(claims.sub).toBe(adminId);

      // Access protected endpoint with Bearer token
      const meRes = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${body.accessToken}`)
        .expect(200);
      expect(meRes.body.email).toBe(adminEmail);
      expect(meRes.body.role).toBe('admin');

      // Access Admin-only endpoint GET /api/users with Bearer token
      const usersRes = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${body.accessToken}`)
        .expect(200);
      expect(usersRes.body).toEqual([{ id: adminId }]);
    });

    it('rejects access to admin-only endpoint when role is non-admin (editor)', async () => {
      const editorId = randomUUID();
      const editorToken = await jwt.signAsync({ sub: editorId, tokenVersion: 0 });
      findFirst.mockResolvedValueOnce({
        ...bootstrappedAccount,
        id: editorId,
        role: 'editor',
      });

      await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(401);
    });

    it('rejects login with wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Captcha-Token', 'mock-valid-turnstile-token')
        .send({ email: adminEmail, password: 'WrongP@ssw0rd2026!' })
        .expect(401);
    });

    it('rejects if account role is not admin', async () => {
      findFirst.mockResolvedValueOnce({
        ...bootstrappedAccount,
        role: 'editor',
      });
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Captcha-Token', 'mock-valid-turnstile-token')
        .send({ email: adminEmail, password: adminPassword })
        .expect(401);
    });

    it('rejects if account status is inactive or soft-deleted', async () => {
      findFirst.mockResolvedValueOnce({
        ...bootstrappedAccount,
        status: 'inactive',
      });
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Captcha-Token', 'mock-valid-turnstile-token')
        .send({ email: adminEmail, password: adminPassword })
        .expect(401);

      findFirst.mockResolvedValueOnce({
        ...bootstrappedAccount,
        deletedAt: new Date(),
      });
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Captcha-Token', 'mock-valid-turnstile-token')
        .send({ email: adminEmail, password: adminPassword })
        .expect(401);
    });
  });
});
