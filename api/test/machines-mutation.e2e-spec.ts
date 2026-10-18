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

type Row = Record<string, unknown>;
type Write = { kind: string; table: string; data?: Row | Row[]; sql: string; params: unknown[] };
const machineId = randomUUID();
const imageId = randomUUID();
const standardId = randomUUID();
const clientId = randomUUID();
const clientTime = '2020-01-02T03:04:05.000Z';
const metadata = {
  createdAt: clientTime, updatedAt: clientTime, deletedAt: clientTime,
  publishedAt: clientTime, createdBy: clientId, updatedBy: clientId,
  mainImage: { id: imageId, createdAt: clientTime }, images: [{ id: clientId }],
};
const editable = {
  name: 'QA-03 machine', slug: 'qa-03-machine', model: 'Model 1',
  shortDescription: 'Summary', description: 'Full description',
  status: 'draft', sortOrder: 0,
};
const nested = {
  applications: [{ title: 'Application', description: 'Application details', sortOrder: 0 }],
  highlights: [{ title: 'Highlight', description: 'Highlight details', icon: 'Gauge', sortOrder: 2 }],
  specs: [{ groupName: 'Performance', specName: 'Range', specValue: '10', unit: 'mm', sortOrder: 3 }],
  standards: [{ standardId, note: 'Method note', sortOrder: 4 }],
};

function requestBody(options?: RequestInit): Row {
  if (typeof options?.body !== 'string') throw new Error('Expected a JSON request body');
  return JSON.parse(options.body) as Row;
}

function formMachine(id: string, mainImageId: string | null) {
  return {
    ...editable, ...metadata, id, mainImageId,
    applications: nested.applications.map((row) => ({ ...row, id: clientId, machineId: id })),
    highlights: nested.highlights.map((row) => ({ ...row, id: clientId, machineId: id })),
    specs: nested.specs.map((row) => ({ ...row, id: clientId, machineId: id })),
    standards: nested.standards.map((row) => ({
      ...row, machineId: id, standard: { id: standardId, createdAt: clientTime },
    })),
  };
}

// Run the actual Admin serializer/API client with isolated browser storage and
// a controlled HTTP transport. Transpilation is in memory; no build or DB access.
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
  const payloadModule = load('machine-payload', {});
  return load('api', { './auth': { adminFetch }, './machine-payload': payloadModule }).api as {
    saveMachine: (machine: Row) => Promise<unknown>;
  };
}

describe('QA-03 Machines: Admin payload through HTTP to Drizzle compilation', () => {
  let app: INestApplication<App>;
  let token: string;
  const writes: Write[] = [];
  const compiler = drizzle.mock({ schema });
  const admin = {
    id: randomUUID(), email: 'qa03@example.invalid', fullName: 'QA-03 Admin',
    role: 'admin', status: 'active', deletedAt: null, tokenVersion: 0,
  };
  const db = {
    insert: (table: PgTable) => ({
      values: (data: Row | Row[]) => {
        const query = compiler.insert(table).values(Array.isArray(data) ? data : [data]);
        const compiled = query.returning().toSQL();
        writes.push({ kind: 'insert', table: getTableName(table), data, ...compiled });
        return Object.assign(Promise.resolve([{ id: machineId }]), {
          returning: () => Promise.resolve([{ id: machineId }]),
        });
      },
    }),
    update: (table: PgTable) => ({
      set: (data: Row) => ({
        where: (condition: SQL) => {
          const compiled = compiler.update(table).set(data).where(condition).returning().toSQL();
          writes.push({ kind: 'update', table: getTableName(table), data, ...compiled });
          return { returning: () => Promise.resolve([{ id: machineId }]) };
        },
      }),
    }),
    delete: (table: PgTable) => ({
      where: (condition: SQL) => {
        const compiled = compiler.delete(table).where(condition).toSQL();
        writes.push({ kind: 'delete', table: getTableName(table), ...compiled });
        return Promise.resolve([]);
      },
    }),
  };
  const adminFetch = vi.fn(async (url: string, options?: RequestInit): Promise<Response> => {
    const body = requestBody(options);
    const call = options?.method === 'PUT'
      ? request(app.getHttpServer()).put(url)
      : request(app.getHttpServer()).post(url);
    const response = await call.set('Authorization', `Bearer ${token}`).send(body);
    return new Response(JSON.stringify(response.body), { status: response.status });
  });
  const api = loadAdminApi(adminFetch);

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService).useValue(new ConfigService({
        JWT_SECRET: randomBytes(48).toString('base64url'), JWT_TTL_SECONDS: '3600',
      }))
      .overrideProvider(DRIZZLE).useValue({
        ...db,
        transaction: (callback: (tx: typeof db) => Promise<unknown>) => callback(db),
        query: {
          users: { findFirst: () => Promise.resolve(admin) },
          machines: { findFirst: () => Promise.resolve({ id: machineId, ...editable }) },
        },
      })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    token = await module.get(JwtService).signAsync({ sub: admin.id, tokenVersion: admin.tokenVersion });
  });

  beforeEach(() => { writes.length = 0; adminFetch.mockClear(); });
  afterAll(async () => { await app.close(); });

  function mainWrite() {
    const write = writes.find((entry) => entry.table === 'machines');
    expect(write).toBeDefined();
    return write!;
  }

  function expectSafeWrite(operation: 'create' | 'update', mainImageId: string | null) {
    const write = mainWrite();
    expect(write.data).toEqual({
      ...editable, mainImageId,
      ...(operation === 'update' ? { updatedAt: expect.any(Date) } : {}),
    });
    expect(write.params).not.toContain(clientTime);
    expect(write.params).not.toContain(clientId);
    if (operation === 'update') {
      const setClause = write.sql.split(' set ')[1].split(' where ')[0];
      expect(setClause).not.toMatch(/"(?:id|created_at|deleted_at|published_at|created_by|updated_by)"\s*=/);
      expect(write.sql).toContain('where "machines"."id" =');
      expect(write.params).toContain(machineId);
    } else {
      expect(write.data).not.toHaveProperty('id');
      expect(write.data).not.toHaveProperty('createdAt');
      expect(write.data).not.toHaveProperty('updatedAt');
    }
  }

  function expectNestedWrites(operation: 'create' | 'update') {
    for (const [field, rows] of Object.entries(nested)) {
      const table = `machine_${field}`;
      const inserted = writes.find((write) => write.kind === 'insert' && write.table === table);
      expect(inserted?.data).toEqual(rows.map((row) => ({ ...row, machineId })));
      if (operation === 'update') {
        const removed = writes.find((write) => write.kind === 'delete' && write.table === table);
        expect(removed?.params).toContain(machineId);
      }
    }
  }

  describe.each(['create', 'update'] as const)('%s', (operation) => {
    it.each([null, '', imageId])('sends only writable fields and compiles with image %j', async (image) => {
      const form = formMachine(operation === 'create' ? '' : machineId, image);
      const before = structuredClone(form);
      const result = await api.saveMachine(form);
      expect(result).toMatchObject({ id: machineId });
      expect(form).toEqual(before);
      expect(adminFetch).toHaveBeenCalledOnce();
      const [url, options] = adminFetch.mock.calls[0];
      expect(url).toBe(operation === 'create' ? '/api/machines' : `/api/machines/${machineId}`);
      expect(options?.method).toBe(operation === 'create' ? 'POST' : 'PUT');
      expect(requestBody(options)).toEqual({ ...editable, mainImageId: image || null, ...nested });
      expectSafeWrite(operation, image || null);
      expectNestedWrites(operation);
    });

    it.each(['', clientId])('ignores legacy body ID %j, system fields and nested IDs sent directly to the API', async (id) => {
      const payload = formMachine(id, imageId);
      const call = operation === 'create'
        ? request(app.getHttpServer()).post('/api/machines')
        : request(app.getHttpServer()).put(`/api/machines/${machineId}`);
      await call.set('Authorization', `Bearer ${token}`).send(payload)
        .expect(operation === 'create' ? 201 : 200);
      expectSafeWrite(operation, imageId);
      expectNestedWrites(operation);
    });

    it.each(['', '   '])('normalizes legacy empty image %j on the server', async (mainImageId) => {
      const call = operation === 'create'
        ? request(app.getHttpServer()).post('/api/machines')
        : request(app.getHttpServer()).put(`/api/machines/${machineId}`);
      await call.set('Authorization', `Bearer ${token}`).send({ ...editable, mainImageId })
        .expect(operation === 'create' ? 201 : 200);
      expectSafeWrite(operation, null);
    });

    it.each(['not-a-uuid', 123])('rejects invalid image %j before query compilation', async (mainImageId) => {
      const call = operation === 'create'
        ? request(app.getHttpServer()).post('/api/machines')
        : request(app.getHttpServer()).put(`/api/machines/${machineId}`);
      await call.set('Authorization', `Bearer ${token}`).send({ ...editable, mainImageId }).expect(400);
      expect(writes).toHaveLength(0);
    });

    it('requires Admin authentication', async () => {
      const call = operation === 'create'
        ? request(app.getHttpServer()).post('/api/machines')
        : request(app.getHttpServer()).put(`/api/machines/${machineId}`);
      await call.send(editable).expect(401);
      expect(writes).toHaveLength(0);
    });
  });

  it('preserves omitted image, timestamps and nested collections on partial update', async () => {
    await request(app.getHttpServer()).put(`/api/machines/${machineId}`)
      .set('Authorization', `Bearer ${token}`).send({ name: 'Renamed machine' }).expect(200);
    expect(writes).toHaveLength(1);
    const write = mainWrite();
    const setClause = write.sql.split(' set ')[1].split(' where ')[0];
    expect(setClause).toMatch(/^"name" = \$1, "updated_at" = \$2$/);
    expect(write.data).toHaveProperty('updatedAt', expect.any(Date));
    expect(write.params[0]).toBe('Renamed machine');
  });

  it('also preserves omitted image and nested fields through the Admin serializer on partial update', async () => {
    await api.saveMachine({ id: machineId, name: 'Renamed machine' });
    expect(adminFetch).toHaveBeenCalledOnce();
    expect(requestBody(adminFetch.mock.calls[0][1])).toEqual({ name: 'Renamed machine' });
    expect(writes).toHaveLength(1);
    const setClause = mainWrite().sql.split(' set ')[1].split(' where ')[0];
    expect(setClause).toMatch(/^"name" = \$1, "updated_at" = \$2$/);
  });

  it.each(['not-a-uuid', '123', machineId.slice(1)])
    ('rejects invalid update route UUID %s before any mutation query', async (id) => {
      await request(app.getHttpServer()).put(`/api/machines/${id}`)
        .set('Authorization', `Bearer ${token}`).send({ name: 'Renamed', id: machineId }).expect(400);
      expect(writes).toHaveLength(0);
    });

  it('keeps the existing explicit empty-array behavior when removing nested rows', async () => {
    await request(app.getHttpServer()).put(`/api/machines/${machineId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ applications: [], highlights: [], specs: [], standards: [] }).expect(200);
    expect(writes.filter((write) => write.kind === 'delete').map((write) => write.table).sort())
      .toEqual(['machine_applications', 'machine_highlights', 'machine_specs', 'machine_standards']);
    expect(writes.filter((write) => write.kind === 'insert')).toHaveLength(0);
  });

  it('still generates a slug on create without requiring client system fields', async () => {
    await request(app.getHttpServer()).post('/api/machines').set('Authorization', `Bearer ${token}`)
      .send({ name: 'New machine', mainImageId: null }).expect(201);
    expect(mainWrite().data).toMatchObject({ name: 'New machine', slug: 'new-machine', mainImageId: null });
    expect(mainWrite().data).not.toHaveProperty('id');
  });
});
