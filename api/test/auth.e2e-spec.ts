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

type Account = typeof users.$inferSelect;
const accountId = randomUUID();
const email = `${randomUUID()}@example.invalid`;
const password = randomBytes(24).toString('base64url');
const secret = randomBytes(48).toString('base64url');

describe('QA-01: Admin authentication (real JWT/guard/bcrypt, isolated persistence)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;
  let account: Account;
  const findFirst = vi.fn<() => Promise<Account | undefined>>();
  const updateWhere = vi.fn().mockResolvedValue([]);
  const updateSet = vi.fn().mockImplementation((updates: Record<string, unknown>) => {
    if (updates && typeof updates.passwordHash === 'string') {
      account.passwordHash = updates.passwordHash;
    }
    return { where: updateWhere };
  });
  const update = vi.fn().mockReturnValue({ set: updateSet });
  const machineCreate = vi.fn(() => ({ id: accountId }));
  const contactCreate = vi.fn((body: unknown) => body);

  beforeAll(async () => {
    account = {
      id: accountId, email, fullName: 'QA Test Identity', passwordHash: await hash(password, 4),
      role: 'admin', status: 'active', deletedAt: null, lastLoginAt: null,
      failedLoginAttempts: 0, lockedUntil: null,
      createdAt: new Date(), updatedAt: new Date(),
    };
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService).useValue(new ConfigService({ JWT_SECRET: secret, JWT_TTL_SECONDS: '3600' }))
      .overrideProvider(DRIZZLE).useValue({ query: { users: { findFirst } }, update })
      .overrideProvider(UsersService).useValue({ findAll: () => [{ id: accountId }] })
      .overrideProvider(MachinesService).useValue({
        findAll: () => [], findPublished: () => [], findPublishedByIdOrSlug: () => ({ id: accountId }), create: machineCreate,
      })
      .overrideProvider(NewsEventsService).useValue({
        findAll: () => [], findPublished: () => [], findPublishedByIdOrSlug: () => ({ id: accountId }),
      })
      .overrideProvider(ContactsService).useValue({ findAll: () => [], create: contactCreate })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    jwt = module.get(JwtService);
  });

  beforeEach(() => {
    findFirst.mockReset().mockResolvedValue(account);
    machineCreate.mockClear();
    contactCreate.mockClear();
  });

  afterAll(async () => { await app.close(); });

  const protectedRoutes = [
    ['get', '/auth/me'],
    ['get', '/users'], ['get', `/users/${accountId}`], ['post', '/users'], ['put', `/users/${accountId}`], ['delete', `/users/${accountId}`],
    ['get', '/contacts'], ['get', `/contacts/${accountId}`], ['patch', `/contacts/${accountId}`], ['patch', `/contacts/${accountId}/status`], ['delete', `/contacts/${accountId}`],
    ['get', '/admin/machines'], ['get', `/admin/machines/${accountId}`], ['post', '/machines'], ['put', `/machines/${accountId}`], ['delete', `/machines/${accountId}`],
    ['get', '/admin/news-events'], ['get', `/admin/news-events/${accountId}`], ['post', '/news-events'], ['put', `/news-events/${accountId}`], ['delete', `/news-events/${accountId}`],
    ['get', '/media'], ['get', `/media/${accountId}`], ['post', '/media'], ['delete', `/media/${accountId}`],
    ['get', '/standards'], ['get', `/standards/${accountId}`], ['post', '/standards'], ['put', `/standards/${accountId}`], ['delete', `/standards/${accountId}`],
  ] as const;

  it.each(protectedRoutes)('rejects anonymous %s /api%s before accessing data', async (method, route) => {
    await request(app.getHttpServer())[method](`/api${route}`).expect(401);
    expect(findFirst).not.toHaveBeenCalled();
    expect(machineCreate).not.toHaveBeenCalled();
  });

  it.each(['/api', '/api/machines', `/api/machines/${accountId}`, '/api/news-events', `/api/news-events/${accountId}`])('keeps public read %s accessible', async (route) => {
    await request(app.getHttpServer()).get(route).expect(200);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('does not require authentication to submit a contact', async () => {
    const body = {
      fullName: 'Visitor', companyName: 'Visitor Organization', phone: '+84 912 345 678',
      email: 'visitor@example.invalid', requestType: 'other', message: 'Contact request',
    };
    await request(app.getHttpServer()).post('/api/contacts').send(body).expect(202);
    expect(contactCreate).toHaveBeenCalledWith(body);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('rejects an unknown email', async () => {
    findFirst.mockResolvedValue(undefined);
    await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'unknown@example.invalid', password }).expect(401);
  });

  it('rejects an incorrect password', async () => {
    await request(app.getHttpServer()).post('/api/auth/login').send({ email, password: randomBytes(24).toString('base64url') }).expect(401);
  });

  it.each([
    { status: 'inactive' }, { role: 'editor' }, { deletedAt: new Date() }, { passwordHash: 'legacy-placeholder' },
  ])('rejects an ineligible account %j', async (fields) => {
    findFirst.mockResolvedValue({ ...account, ...fields });
    await request(app.getHttpServer()).post('/api/auth/login').send({ email, password }).expect(401);
  });

  it.each([{}, { email, password: 123 }, { email, password: '' }])('rejects malformed login without querying accounts: %j', async (body) => {
    await request(app.getHttpServer()).post('/api/auth/login').send(body).expect(401);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('issues a configured token to an active Admin and excludes the password hash', async () => {
    const response = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password }).expect(200);
    const body = response.body as { accessToken: string; tokenType: string; expiresAt: number; user: object };
    const claims = jwt.verify<{ sub: string; iat: number; exp: number }>(body.accessToken);
    expect(claims.sub).toBe(accountId);
    expect(claims.exp - claims.iat).toBe(3600);
    expect(body.expiresAt).toBe(claims.exp * 1000);
    expect(body.tokenType).toBe('Bearer');
    expect(body.user).toEqual({ id: accountId, email, fullName: account.fullName, role: 'admin' });
    expect(JSON.stringify(body)).not.toContain('passwordHash');
    expect(response.headers['cache-control']).toBe('no-store');

    await request(app.getHttpServer()).get('/api/users').set('Authorization', `Bearer ${body.accessToken}`).expect(200);
    await request(app.getHttpServer()).get('/api/contacts').set('Authorization', `Bearer ${body.accessToken}`).expect(200);
    await request(app.getHttpServer()).post('/api/machines').set('Authorization', `Bearer ${body.accessToken}`).send({ name: 'QA' }).expect(201);
    expect(machineCreate).toHaveBeenCalledOnce();
    const me = await request(app.getHttpServer()).get('/api/auth/me').set('Authorization', `Bearer ${body.accessToken}`).expect(200);
    expect(me.body).toEqual(body.user);
    expect(JSON.stringify(me.body)).not.toContain('passwordHash');
  });

  it('rejects invalid tokens', async () => {
    const badToken = await jwt.signAsync({ sub: accountId }, { secret: randomBytes(48).toString('base64url') });
    await request(app.getHttpServer()).get('/api/users').set('Authorization', `Bearer ${badToken}`).expect(401);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('rejects expired tokens', async () => {
    const expired = await jwt.signAsync({ sub: accountId }, { expiresIn: -1 });
    await request(app.getHttpServer()).get('/api/users').set('Authorization', `Bearer ${expired}`).expect(401);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('rejects tokens issued for a different audience', async () => {
    const token = await jwt.signAsync({ sub: accountId }, { audience: 'another-app' });
    await request(app.getHttpServer()).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(401);
  });

  it.each([{ status: 'inactive' }, { role: 'editor' }, { deletedAt: new Date() }])('re-checks account eligibility for existing tokens: %j', async (fields) => {
    const token = await jwt.signAsync({ sub: accountId });
    findFirst.mockResolvedValue({ ...account, ...fields });
    await request(app.getHttpServer()).get('/api/users').set('Authorization', `Bearer ${token}`).expect(401);
  });

  it('rejects a token whose account no longer exists', async () => {
    const token = await jwt.signAsync({ sub: accountId });
    findFirst.mockResolvedValue(undefined);
    await request(app.getHttpServer()).get('/api/users').set('Authorization', `Bearer ${token}`).expect(401);
  });

  it('PR-10A: change password E2E flow (unauthenticated, wrong current, success, old fails, new succeeds)', async () => {
    // 1. Unauthenticated request -> 401
    await request(app.getHttpServer())
      .post('/api/auth/change-password')
      .send({ currentPassword: password, newPassword: 'NewValidPassword#2026' })
      .expect(401);

    // 2. Login to get token
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    const token = loginRes.body.accessToken;

    // 3. Wrong current password -> 400
    await request(app.getHttpServer())
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'WrongPassword#123', newPassword: 'NewValidPassword#2026' })
      .expect(400);

    // 4. Valid change password -> 200
    const newPass = 'NewValidPassword#2026';
    const changeRes = await request(app.getHttpServer())
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: password, newPassword: newPass })
      .expect(200);
    expect(changeRes.body).toHaveProperty('message');
    expect(JSON.stringify(changeRes.body)).not.toContain('passwordHash');

    // 5. Old password login afterward -> 401
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(401);

    // 6. New password login afterward -> 200
    const newLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: newPass })
      .expect(200);
    expect(newLoginRes.body.user.id).toBe(accountId);

    // Restore original password hash for subsequent tests
    account.passwordHash = await hash(password, 4);
  });
});

