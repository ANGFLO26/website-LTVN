import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getTableName, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/postgres-js';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';
import { AppModule } from '../src/app.module.js';
import { DRIZZLE } from '../src/database/database.module.js';
import * as schema from '../src/database/schema.js';
import { StandardsService } from '../src/modules/standards/standards.service.js';

type Row = Record<string, unknown>;
type Write = { data: Row; sql: string; params: unknown[] };
const standardId = randomUUID();
const clientId = randomUUID();
const clientTime = '2020-01-02T03:04:05.000Z';
const editable = {
  code: 'ASTM D1234', organization: 'ASTM', year: 2026,
  title: 'Standard title', description: 'Standard description',
};
const metadata = {
  createdAt: clientTime, updatedAt: clientTime, deletedAt: clientTime,
  createdBy: randomUUID(), updatedBy: randomUUID(),
  machineStandards: [{ machineId: randomUUID(), standardId: clientId }],
};
const original = {
  ...editable, id: standardId, code: 'Existing code', organization: 'Existing organization',
  year: 2021, title: 'Original title', description: 'Original description',
  createdAt: new Date('2021-01-01T00:00:00Z'), updatedAt: new Date('2021-02-01T00:00:00Z'),
};

function defined(data: Row) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

function requestBody(options?: RequestInit): Row {
  if (typeof options?.body !== 'string') throw new Error('Expected a JSON request body');
  return JSON.parse(options.body) as Row;
}

// Use the real browser serializer, isolated storage, and in-process HTTP only.
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
    saveStandard: (standard: Row) => Promise<unknown>;
  };
}

describe('QA-03 Standards: mutation allowlist, UUID route and server-owned dates', () => {
  let app: INestApplication<App>;
  let service: StandardsService;
  let token: string;
  let stored: Row;
  const writes: Write[] = [];
  const compiler = drizzle.mock({ schema });
  const actor = {
    id: randomUUID(), email: 'standards-admin@example.invalid', fullName: 'Standards Admin',
    role: 'admin', status: 'active', deletedAt: null, tokenVersion: 0,
  };
  const adminFetch = vi.fn(async (url: string, options?: RequestInit): Promise<Response> => {
    const call = options?.method === 'PUT'
      ? request(app.getHttpServer()).put(url)
      : request(app.getHttpServer()).post(url);
    const response = await call.set('Authorization', `Bearer ${token}`).send(requestBody(options));
    return new Response(JSON.stringify(response.body), { status: response.status });
  });
  const api = loadAdminApi(adminFetch);

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService).useValue(new ConfigService({
        JWT_SECRET: randomBytes(48).toString('base64url'), JWT_TTL_SECONDS: '3600',
      }))
      .overrideProvider(DRIZZLE).useValue({
        // Compile real Drizzle SQL, never execute it or open a database connection.
        insert: (table: PgTable) => ({
          values: (data: Row) => ({
            returning: () => {
              expect(getTableName(table)).toBe('standards');
              writes.push({ data, ...compiler.insert(table).values(data).returning().toSQL() });
              stored = {
                id: standardId, createdAt: new Date(), updatedAt: new Date(),
                year: null, title: null, description: null, ...defined(data),
              };
              return Promise.resolve([{ ...stored }]);
            },
          }),
        }),
        update: (table: PgTable) => ({
          set: (data: Row) => ({
            where: (condition: SQL) => ({
              returning: () => {
                expect(getTableName(table)).toBe('standards');
                const query = compiler.update(table).set(data).where(condition).returning().toSQL();
                writes.push({ data, ...query });
                if (!query.params.includes(standardId)) return Promise.resolve([]);
                stored = { ...stored, ...defined(data) };
                return Promise.resolve([{ ...stored }]);
              },
            }),
          }),
        }),
        query: { users: { findFirst: () => Promise.resolve(actor) } },
      })
      .compile();
    service = module.get(StandardsService);
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    token = await module.get(JwtService).signAsync({ sub: actor.id, tokenVersion: actor.tokenVersion });
  });

  beforeEach(() => { stored = structuredClone(original); writes.length = 0; adminFetch.mockClear(); });
  afterAll(async () => { await app.close(); });

  function call(operation: 'create' | 'update', authenticated = true) {
    const result = operation === 'create'
      ? request(app.getHttpServer()).post('/api/standards')
      : request(app.getHttpServer()).put(`/api/standards/${standardId}`);
    return authenticated ? result.set('Authorization', `Bearer ${token}`) : result;
  }

  function expectSafeWrite(operation: 'create' | 'update', fields: Row) {
    expect(writes).toHaveLength(1);
    const write = writes[0];
    expect(defined(write.data)).toEqual({
      ...fields, ...(operation === 'update' ? { updatedAt: expect.any(Date) } : {}),
    });
    for (const field of ['id', 'createdAt', 'deletedAt', 'createdBy', 'updatedBy', 'machineStandards']) {
      expect(write.data).not.toHaveProperty(field);
    }
    expect(write.params).not.toContain(clientId);
    expect(write.params).not.toContain(clientTime);
    expect(stored.id).toBe(standardId);
    if (operation === 'create') {
      expect(write.data).not.toHaveProperty('updatedAt');
      const match = write.sql.match(/insert into "standards" \((.*?)\) values \((.*?)\) returning/);
      expect(match).not.toBeNull();
      const columns = match![1].split(', ').map((column) => column.replaceAll('"', ''));
      const values = match![2].split(', ');
      for (const column of ['id', 'created_at', 'updated_at']) {
        expect(values[columns.indexOf(column)]).toBe('default');
      }
    } else {
      expect(stored.createdAt).toEqual(original.createdAt);
      expect(stored.updatedAt).not.toEqual(original.updatedAt);
      const setClause = write.sql.split(' set ')[1].split(' where ')[0];
      expect(setClause).not.toMatch(/"(?:id|created_at)"\s*=/);
      expect(write.params).toContain((write.data.updatedAt as Date).toISOString());
      expect(write.sql).toContain('where "standards"."id" =');
      expect(write.params.at(-1)).toBe(standardId);
    }
  }

  describe.each(['create', 'update'] as const)('%s', (operation) => {
    it('serializes only editable form fields and compiles the real Drizzle query', async () => {
      const input = { ...editable, ...metadata, id: operation === 'create' ? '' : standardId };
      const before = structuredClone(input);
      const result = await api.saveStandard(input);
      expect(input).toEqual(before);
      expect(adminFetch).toHaveBeenCalledOnce();
      const [url, options] = adminFetch.mock.calls[0];
      expect(url).toBe(operation === 'create' ? '/api/standards' : `/api/standards/${standardId}`);
      expect(options?.method).toBe(operation === 'create' ? 'POST' : 'PUT');
      expect(requestBody(options)).toEqual(editable);
      expectSafeWrite(operation, editable);
      expect(result).toMatchObject({ ...editable, id: standardId });
    });

    it.each(['', clientId])('ignores legacy body ID %j and system metadata', async (id) => {
      await call(operation).send({ ...editable, ...metadata, id }).expect(operation === 'create' ? 201 : 200);
      expectSafeWrite(operation, editable);
    });

    it('enforces service allowlisting even when called without the validation pipe', async () => {
      const input = { ...editable, ...metadata, id: clientId };
      if (operation === 'create') await service.create(input);
      else await service.update(standardId, input);
      expectSafeWrite(operation, editable);
    });

    it('preserves nullable year/title/description through frontend, HTTP and SQL', async () => {
      const fields = { ...editable, year: null, title: null, description: null };
      const result = await api.saveStandard({ ...fields, id: operation === 'create' ? '' : standardId });
      expect(requestBody(adminFetch.mock.calls[0][1])).toEqual(fields);
      expectSafeWrite(operation, fields);
      expect(result).toMatchObject(fields);
    });

    it.each([
      ['code', null], ['organization', null], ['code', 123], ['organization', []],
      ['year', '2026'], ['year', 2026.5], ['title', {}], ['description', false],
      ['code', 'x'.repeat(151)], ['organization', 'x'.repeat(51)], ['title', 'x'.repeat(501)],
    ])('rejects invalid type/length for %s (%j) before Drizzle', async (field, value) => {
      await call(operation).send({ ...editable, [field as string]: value }).expect(400);
      expect(writes).toHaveLength(0);
    });

    it('still requires Admin authentication', async () => {
      await call(operation, false).send(editable).expect(401);
      expect(writes).toHaveLength(0);
    });
  });

  it.each(['code', 'organization'])('requires %s on create', async (field) => {
    const input: Row = { ...editable };
    delete input[field];
    await call('create').send(input).expect(400);
    expect(writes).toHaveLength(0);
  });

  it('accepts omitted nullable fields on create', async () => {
    const fields = { code: editable.code, organization: editable.organization };
    await call('create').send(fields).expect(201);
    expectSafeWrite('create', fields);
    expect(stored).toMatchObject({ year: null, title: null, description: null });
  });

  it.each([
    { code: 'New code' }, { organization: 'Custom organization' }, { year: 0 },
    { title: '' }, { description: 'New description' }, {},
  ])('preserves omitted fields during partial update %j', async (fields) => {
    const before = structuredClone(stored);
    const result = await api.saveStandard({ id: standardId, ...fields });
    expect(adminFetch).toHaveBeenCalledOnce();
    expect(requestBody(adminFetch.mock.calls[0][1])).toEqual(fields);
    expectSafeWrite('update', fields);
    expect(stored).toEqual({ ...before, ...fields, updatedAt: expect.any(Date) });
    expect(result).toMatchObject({ id: standardId, ...fields });
    const setClause = writes[0].sql.split(' set ')[1].split(' where ')[0];
    for (const field of Object.keys(editable).filter((key) => !(key in fields))) {
      expect(setClause).not.toContain(`"${field}" =`);
    }
  });

  it('ignores a metadata-only update and keeps business data unchanged', async () => {
    await call('update').send({ ...metadata, id: clientId }).expect(200);
    expectSafeWrite('update', {});
    expect(stored).toEqual({ ...original, updatedAt: expect.any(Date) });
  });

  it.each(['not-a-uuid', '123', standardId.slice(1), 'zzzzzzzz-zzzz-4zzz-8zzz-zzzzzzzzzzzz'])
    ('rejects invalid route UUID %s before any mutation query', async (id) => {
      await request(app.getHttpServer()).put(`/api/standards/${id}`)
        .set('Authorization', `Bearer ${token}`).send({ ...editable, id: standardId }).expect(400);
      expect(writes).toHaveLength(0);
      expect(stored).toEqual(original);
    });

  it('uses only the route ID and returns 404 for a missing record, even if the body ID exists', async () => {
    await request(app.getHttpServer()).put(`/api/standards/${clientId}`)
      .set('Authorization', `Bearer ${token}`).send({ title: 'New title', id: standardId }).expect(404);
    expect(writes).toHaveLength(1);
    expect(writes[0].params.at(-1)).toBe(clientId);
    expect(writes[0].data).not.toHaveProperty('id');
    expect(stored).toEqual(original);
  });
});
