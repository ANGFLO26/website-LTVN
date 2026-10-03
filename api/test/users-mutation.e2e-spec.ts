import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import { getTableName, type SQL } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/postgres-js';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';
import { AppModule } from '../src/app.module.js';
import { DRIZZLE, type DrizzleDb } from '../src/database/database.module.js';
import * as schema from '../src/database/schema.js';

type Row = Record<string, unknown>;
type Projection = Record<string, AnyPgColumn>;
type Write = { data: Row; sql: string; params: unknown[] };
type UserQuery = NonNullable<Parameters<DrizzleDb['query']['users']['findFirst']>[0]>;
const userId = randomUUID();
const forgedId = randomUUID();
const password = randomBytes(24).toString('base64url');
const clientTime = '2020-01-02T03:04:05.000Z';
const legacyPlaceholder = '$2b$10$defaultPasswordHashPlaceholder';
const editable = {
  email: 'edited-user@example.invalid', fullName: 'Edited User', role: 'admin', status: 'active',
};
const metadata = {
  createdAt: clientTime, updatedAt: clientTime, lastLoginAt: clientTime, deletedAt: clientTime,
  passwordHash: 'client-supplied-hash-must-not-be-used',
};

function requestBody(options?: RequestInit): Row {
  if (typeof options?.body !== 'string') throw new Error('Expected a JSON request body');
  return JSON.parse(options.body) as Row;
}

// Real Admin serializer, isolated browser storage, and HTTP routed only to this test app.
function loadAdminApi(adminFetch: (url: string, options?: RequestInit) => Promise<Response>) {
  function load(file: string, dependencies: Record<string, object>) {
    const source = readFileSync(new URL(`../../admin/src/services/${file}.ts`, import.meta.url), 'utf8');
    const exports: Record<string, unknown> = {};
    const compiled = transpileModule(source, {
      compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2023 },
    });
    runInNewContext(compiled.outputText, {
      exports, AbortSignal, crypto: { randomUUID },
      localStorage: { getItem: () => '[]', setItem: () => {} },
      require: (name: string) => {
        if (!(name in dependencies)) throw new Error(`Unexpected frontend dependency: ${name}`);
        return dependencies[name];
      },
    });
    return exports;
  }
  const machinePayload = load('machine-payload', {});
  return load('api', { './auth': { adminFetch }, './machine-payload': machinePayload }).api as {
    saveUser: (user: Row) => Promise<unknown>;
  };
}

describe('QA-03 Users: mutation allowlist, UUID route and credential preservation', () => {
  let app: INestApplication<App>;
  let token: string;
  let original: schema.User;
  let stored: Row;
  const writes: Write[] = [];
  const compiler = drizzle.mock({ schema });
  const actor = {
    id: randomUUID(), email: 'acting-admin@example.invalid', fullName: 'Acting Admin',
    role: 'admin', status: 'active', deletedAt: null,
  };

  function defined(data: Row) {
    return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
  }

  function project(selection?: Projection) {
    return selection
      ? Object.fromEntries(Object.entries(stored).filter(([key]) => key in selection))
      : { ...stored };
  }

  const adminFetch = vi.fn(async (url: string, options?: RequestInit): Promise<Response> => {
    const call = options?.method === 'PUT'
      ? request(app.getHttpServer()).put(url)
      : request(app.getHttpServer()).post(url);
    const response = await call.set('Authorization', `Bearer ${token}`).send(requestBody(options));
    return new Response(JSON.stringify(response.body), { status: response.status });
  });
  const api = loadAdminApi(adminFetch);

  beforeAll(async () => {
    original = {
      id: userId, email: 'existing-admin@example.invalid', fullName: 'Existing Admin',
      passwordHash: await hash(password, 4), role: 'admin', status: 'active',
      createdAt: new Date('2021-01-01T00:00:00Z'), updatedAt: new Date('2021-02-01T00:00:00Z'),
      lastLoginAt: new Date('2021-03-01T00:00:00Z'), deletedAt: null,
    };
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService).useValue(new ConfigService({
        JWT_SECRET: randomBytes(48).toString('base64url'), JWT_TTL_SECONDS: '3600',
      }))
      .overrideProvider(DRIZZLE).useValue({
        // Compile real Drizzle queries without a connection; writes affect fixture memory only.
        insert: (table: PgTable) => ({
          values: (data: Row) => ({
            returning: (selection?: Projection) => {
              expect(getTableName(table)).toBe('users');
              const builder = compiler.insert(table).values(data);
              const query = selection ? builder.returning(selection) : builder.returning();
              writes.push({ data, ...query.toSQL() });
              stored = {
                id: userId, createdAt: new Date(), updatedAt: new Date(),
                lastLoginAt: null, deletedAt: null, status: 'active', ...defined(data),
              };
              return Promise.resolve([project(selection)]);
            },
          }),
        }),
        update: (table: PgTable) => ({
          set: (data: Row) => ({
            where: (condition: SQL) => ({
              returning: (selection?: Projection) => {
                expect(getTableName(table)).toBe('users');
                const builder = compiler.update(table).set(data).where(condition);
                const query = selection ? builder.returning(selection) : builder.returning();
                writes.push({ data, ...query.toSQL() });
                stored = { ...stored, ...defined(data) };
                return Promise.resolve([project(selection)]);
              },
            }),
          }),
        }),
        query: {
          users: {
            findFirst: (options: UserQuery) => {
              const { params } = compiler.query.users.findFirst(options).toSQL();
              const record = params.includes(actor.id) || params.includes(actor.email) ? actor
                : params.includes(stored.id) || params.includes(stored.email) ? stored : undefined;
              return Promise.resolve(record);
            },
          },
        },
      })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    token = await module.get(JwtService).signAsync({ sub: actor.id });
  });

  beforeEach(() => { stored = structuredClone(original); writes.length = 0; adminFetch.mockClear(); });
  afterAll(async () => { await app.close(); });

  function call(operation: 'create' | 'update', authenticated = true) {
    const result = operation === 'create'
      ? request(app.getHttpServer()).post('/api/users')
      : request(app.getHttpServer()).put(`/api/users/${userId}`);
    return authenticated ? result.set('Authorization', `Bearer ${token}`) : result;
  }

  function expectSafeWrite(operation: 'create' | 'update', fields: Row) {
    expect(writes).toHaveLength(1);
    const write = writes[0];
    expect(defined(write.data)).toEqual({
      ...fields,
      ...(operation === 'create' ? { passwordHash: legacyPlaceholder } : { updatedAt: expect.any(Date) }),
    });
    for (const field of ['id', 'createdAt', 'lastLoginAt', 'deletedAt']) {
      expect(write.data).not.toHaveProperty(field);
    }
    expect(write.params).not.toContain(forgedId);
    expect(write.params).not.toContain(clientTime);
    expect(write.params).not.toContain(metadata.passwordHash);
    expect(write.sql.split(' returning ')[1]).not.toContain('password_hash');
    expect(stored.id).toBe(userId);
    if (operation === 'create') {
      expect(write.data).not.toHaveProperty('updatedAt');
      expect(stored.lastLoginAt).toBeNull();
      expect(stored.deletedAt).toBeNull();
    } else {
      expect(write.data).not.toHaveProperty('passwordHash');
      expect(stored).toMatchObject({
        id: original.id, createdAt: original.createdAt, lastLoginAt: original.lastLoginAt,
        deletedAt: original.deletedAt, passwordHash: original.passwordHash,
      });
      const setClause = write.sql.split(' set ')[1].split(' where ')[0];
      expect(setClause).not.toMatch(/"(?:id|created_at|last_login_at|deleted_at|password_hash)"\s*=/);
      expect(write.sql).toContain('where "users"."id" =');
      expect(write.params).toContain(userId);
    }
  }

  describe.each(['create', 'update'] as const)('%s', (operation) => {
    it.each([
      ['admin', 'active'], ['admin', 'inactive'], ['editor', 'active'], ['editor', 'inactive'],
    ])('serializes only the existing form fields for %s/%s', async (role, status) => {
      const fields = { ...editable, role, status };
      const form = { ...fields, ...metadata, id: operation === 'create' ? '' : userId };
      const before = structuredClone(form);
      const response = await api.saveUser(form);
      expect(form).toEqual(before);
      expect(adminFetch).toHaveBeenCalledOnce();
      const [url, options] = adminFetch.mock.calls[0];
      expect(url).toBe(operation === 'create' ? '/api/users' : `/api/users/${userId}`);
      expect(options?.method).toBe(operation === 'create' ? 'POST' : 'PUT');
      expect(requestBody(options)).toEqual(fields);
      expectSafeWrite(operation, fields);
      expect(response).toMatchObject({ ...fields, id: userId });
      expect(response).not.toHaveProperty('passwordHash');
      expect(JSON.stringify(response)).not.toContain(original.passwordHash);
      expect(JSON.stringify(response)).not.toContain(legacyPlaceholder);
    });

    it.each(['', forgedId])('ignores body ID %j, timestamps and hash sent directly to the API', async (id) => {
      const response = await call(operation).send({ ...editable, ...metadata, id })
        .expect(operation === 'create' ? 201 : 200);
      expectSafeWrite(operation, editable);
      expect(response.body).toMatchObject({ ...editable, id: userId });
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('requires Admin authentication', async () => {
      await call(operation, false).send(editable).expect(401);
      expect(writes).toHaveLength(0);
    });
  });

  it.each(['not-a-uuid', '123', userId.slice(1), 'zzzzzzzz-zzzz-4zzz-8zzz-zzzzzzzzzzzz'])
    ('rejects route UUID %s before any mutation query', async (id) => {
      const before = structuredClone(stored);
      await request(app.getHttpServer()).put(`/api/users/${id}`).set('Authorization', `Bearer ${token}`)
        .send({ ...editable, id: userId }).expect(400);
      expect(writes).toHaveLength(0);
      expect(stored).toEqual(before);
    });

  it.each([
    { fullName: 'Renamed User' }, { email: 'new-email@example.invalid' }, { role: 'editor' }, { status: 'inactive' },
  ])('preserves omitted fields during partial update %j', async (fields) => {
    const before = structuredClone(stored);
    await call('update').send(fields).expect(200);
    expectSafeWrite('update', fields);
    expect(stored).toEqual({ ...before, ...fields, updatedAt: expect.any(Date) });
  });

  it('preserves the existing credential through an edit, then allows active ADMIN login and safe /auth/me', async () => {
    await call('update').send({ fullName: 'Updated Admin', ...metadata, id: forgedId }).expect(200);
    expectSafeWrite('update', { fullName: 'Updated Admin' });
    const login = await request(app.getHttpServer()).post('/api/auth/login')
      .send({ email: original.email, password }).expect(200);
    const body = login.body as { accessToken: string; user: Row };
    expect(body.user).toEqual({ id: userId, email: original.email, fullName: 'Updated Admin', role: 'admin' });
    expect(login.text).not.toContain('passwordHash');
    const me = await request(app.getHttpServer()).get('/api/auth/me')
      .set('Authorization', `Bearer ${body.accessToken}`).expect(200);
    expect(me.body).toEqual(body.user);
    expect(me.text).not.toContain('passwordHash');
    expect(me.text).not.toContain(original.passwordHash);
  });

  it.each([{ status: 'inactive' }, { role: 'editor' }])('keeps QA-01 login restrictions after editing %j', async (fields) => {
    await call('update').send(fields).expect(200);
    expect(stored.passwordHash).toBe(original.passwordHash);
    await request(app.getHttpServer()).post('/api/auth/login').send({ email: original.email, password }).expect(401);
  });

  it('retains the known legacy placeholder behavior without creating usable credentials', async () => {
    await call('create').send(editable).expect(201);
    expectSafeWrite('create', editable);
    await request(app.getHttpServer()).post('/api/auth/login').send({ email: editable.email, password }).expect(401);
  });
});
