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
import { DRIZZLE, type DrizzleDb } from '../src/database/database.module.js';
import * as schema from '../src/database/schema.js';

type Row = Record<string, unknown>;
type Write = { data: Row; sql: string; params: unknown[] };
type NewsQuery = NonNullable<Parameters<DrizzleDb['query']['newsEvents']['findFirst']>[0]>;
const newsId = randomUUID();
const imageId = randomUUID();
const clientId = randomUUID();
const clientTime = '2020-01-02T03:04:05.000Z';
const startTime = '2026-09-27T09:30:00.000Z';
const endTime = '2026-09-27T11:30:00.000Z';
const editable = {
  type: 'event', title: 'QA-03 event', slug: 'qa-03-event', shortDescription: 'Event summary',
  status: 'draft', location: 'Ho Chi Minh City',
  content: { version: 1, blocks: [
    { type: 'heading', data: { level: 2, text: 'Event title' } },
    { type: 'paragraph', data: { text: 'Keep this content intact.' } },
    { type: 'image', data: { url: '/images/example.png', caption: 'Image caption' } },
  ] },
};
const metadata = {
  createdAt: clientTime, updatedAt: clientTime, deletedAt: clientTime, publishedAt: clientTime,
  authorId: clientId, author: { id: clientId, fullName: 'Client author', passwordHash: 'must-not-write' },
  thumbnailImage: { id: imageId, createdAt: clientTime },
};

function requestBody(options?: RequestInit): Row {
  if (typeof options?.body !== 'string') throw new Error('Expected a JSON request body');
  return JSON.parse(options.body) as Row;
}

// Exercise the real Admin API client without browser storage or external HTTP.
// The existing Machines helper is loaded unchanged; this suite only calls News.
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
    saveNewsEvent: (item: Row) => Promise<unknown>;
  };
}

describe('QA-03 News: writable payload, Date conversion and UUID boundary', () => {
  let app: INestApplication<App>;
  let token: string;
  let stored: Row;
  const writes: Write[] = [];
  const readSql: string[] = [];
  const compiler = drizzle.mock({ schema });
  const admin = {
    id: randomUUID(), email: 'qa03-news@example.invalid', fullName: 'QA-03 News Admin',
    role: 'admin', status: 'active', deletedAt: null, passwordHash: 'private-test-only-hash',
  };

  function initialRecord(): Row {
    return {
      ...structuredClone(editable), id: newsId, thumbnailImageId: imageId, authorId: admin.id,
      createdAt: new Date(clientTime), updatedAt: new Date(clientTime), deletedAt: null,
      publishedAt: new Date(clientTime), eventStartAt: new Date(startTime), eventEndAt: new Date(endTime),
    };
  }

  function defined(data: Row) {
    return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
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
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService).useValue(new ConfigService({
        JWT_SECRET: randomBytes(48).toString('base64url'), JWT_TTL_SECONDS: '3600',
      }))
      .overrideProvider(DRIZZLE).useValue({
        // Compile actual service queries; only fixture memory is changed.
        insert: (table: PgTable) => ({
          values: (data: Row) => {
            const name = getTableName(table);
            if (name === 'news_events') {
              writes.push({ data, ...compiler.insert(table).values(data).returning().toSQL() });
              stored = {
                id: newsId, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
                authorId: null, thumbnailImageId: null, publishedAt: null,
                eventStartAt: null, eventEndAt: null, status: 'draft', ...defined(data),
              };
              return { returning: () => Promise.resolve([{ id: newsId }]) };
            }
            return { returning: () => Promise.resolve([{ id: randomUUID() }]) };
          },
        }),
        update: (table: PgTable) => ({
          set: (data: Row) => ({
            where: (condition: SQL) => {
              const name = getTableName(table);
              if (name === 'news_events') {
                writes.push({ data, ...compiler.update(table).set(data).where(condition).returning().toSQL() });
                stored = { ...stored, ...defined(data) };
                return { returning: () => Promise.resolve([{ id: newsId }]) };
              }
              return { returning: () => Promise.resolve([{ id: newsId }]) };
            },
          }),
        }),
        query: {
          users: { findFirst: () => Promise.resolve(admin) },
          newsEvents: {
            findFirst: (options: NewsQuery) => {
              readSql.push(compiler.query.newsEvents.findFirst(options).toSQL().sql);
              const selection = options.with?.author;
              const columns = selection && selection !== true ? selection.columns : undefined;
              const author = !stored.authorId ? null : columns
                ? Object.fromEntries(Object.entries(admin).filter(([key]) => columns[key as keyof schema.User] === true))
                : { ...admin };
              return Promise.resolve({ ...stored, author });
            },
          },
        },
      })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    token = await module.get(JwtService).signAsync({ sub: admin.id });
  });

  beforeEach(() => {
    stored = initialRecord(); writes.length = 0; readSql.length = 0; adminFetch.mockClear();
  });
  afterAll(async () => { await app.close(); });

  function call(operation: 'create' | 'update', authenticated = true) {
    const result = operation === 'create'
      ? request(app.getHttpServer()).post('/api/news-events')
      : request(app.getHttpServer()).put(`/api/news-events/${newsId}`);
    return authenticated ? result.set('Authorization', `Bearer ${token}`) : result;
  }

  function expectSafeWrite(operation: 'create' | 'update') {
    expect(writes).toHaveLength(1);
    const write = writes[0];
    for (const field of ['id', 'createdAt', 'deletedAt', 'authorId', 'author', 'thumbnailImage']) {
      expect(write.data).not.toHaveProperty(field);
    }
    expect(write.params).not.toContain(clientId);
    expect(write.params).not.toContain(clientTime);
    if (operation === 'create') {
      expect(write.data).not.toHaveProperty('updatedAt');
      expect(write.data.publishedAt).toBeInstanceOf(Date);
      expect(Math.abs(Date.now() - (write.data.publishedAt as Date).getTime())).toBeLessThan(5000);
    } else {
      expect(write.data.updatedAt).toBeInstanceOf(Date);
      expect(write.data).not.toHaveProperty('publishedAt');
      expect(stored.publishedAt).toEqual(new Date(clientTime));
      const setClause = write.sql.split(' set ')[1].split(' where ')[0];
      expect(setClause).not.toMatch(/"(?:id|created_at|deleted_at|published_at|author_id)"\s*=/);
      expect(write.sql).toContain('where "news_events"."id" =');
      expect(write.params).toContain(newsId);
    }
    expect(stored.id).toBe(newsId);
  }

  describe.each(['create', 'update'] as const)('%s', (operation) => {
    it.each([null, '', '   ', imageId])('sends only form fields and compiles with thumbnail %j', async (image) => {
      const form = {
        ...structuredClone(editable), ...metadata, id: operation === 'create' ? '' : newsId,
        thumbnailImageId: image, eventStartAt: startTime, eventEndAt: endTime,
      };
      const before = structuredClone(form);
      const response = await api.saveNewsEvent(form);
      expect(form).toEqual(before);
      expect(adminFetch).toHaveBeenCalledOnce();
      const [url, options] = adminFetch.mock.calls[0];
      expect(url).toBe(operation === 'create' ? '/api/news-events' : `/api/news-events/${newsId}`);
      expect(options?.method).toBe(operation === 'create' ? 'POST' : 'PUT');
      expect(requestBody(options)).toEqual({
        ...editable, thumbnailImageId: image?.trim() || null, eventStartAt: startTime, eventEndAt: endTime,
      });
      expectSafeWrite(operation);
      expect(writes[0].data).toMatchObject({
        ...editable, thumbnailImageId: image?.trim() || null,
        eventStartAt: new Date(startTime), eventEndAt: new Date(endTime),
      });
      expect(response).toMatchObject({ ...editable, id: newsId, eventStartAt: startTime, eventEndAt: endTime });
      expect(stored.eventEndAt).toEqual(new Date(endTime));
      expect(JSON.stringify(response)).not.toContain('passwordHash');
      expect(readSql.join('\n')).not.toContain('password_hash');
      if (operation === 'update') {
        expect(response).toHaveProperty('author', { id: admin.id, fullName: admin.fullName });
      }
    });

    it.each(['', clientId])('ignores legacy body ID %j, metadata and arbitrary authors', async (id) => {
      const response = await call(operation).send({
        ...editable, ...metadata, id, thumbnailImageId: imageId,
        eventStartAt: startTime, eventEndAt: endTime,
      }).expect(operation === 'create' ? 201 : 200);
      expectSafeWrite(operation);
      expect(writes[0].data).toMatchObject({
        ...editable, thumbnailImageId: imageId,
        eventStartAt: new Date(startTime), eventEndAt: new Date(endTime),
      });
      expect(stored.authorId).toBe(operation === 'create' ? null : admin.id);
      expect(response.body).toMatchObject({ ...editable, eventStartAt: startTime, eventEndAt: endTime });
    });

    it.each(['', '   '])('normalizes empty thumbnail %j on the server', async (thumbnailImageId) => {
      await call(operation).send({ ...editable, thumbnailImageId }).expect(operation === 'create' ? 201 : 200);
      expect(writes[0].data.thumbnailImageId).toBeNull();
    });

    it.each(['invalid-uuid', 123])('rejects invalid thumbnail %j before Drizzle', async (thumbnailImageId) => {
      await call(operation).send({ ...editable, thumbnailImageId }).expect(400);
      expect(writes).toHaveLength(0);
    });

    describe.each(['eventStartAt', 'eventEndAt'] as const)('%s', (field) => {
      it.each([startTime, '2028-02-29T16:30:00+07:00'])('converts valid ISO %s before compiling', async (value) => {
        await call(operation).send({ ...editable, [field]: value }).expect(operation === 'create' ? 201 : 200);
        expect(writes[0].data[field]).toBeInstanceOf(Date);
        expect(writes[0].data[field]).toEqual(new Date(value));
        expect(writes[0].params).toContain(new Date(value).toISOString());
      });

      it('accepts explicit null', async () => {
        await call(operation).send({ ...editable, [field]: null }).expect(operation === 'create' ? 201 : 200);
        expect(writes[0].data[field]).toBeNull();
        expect(stored[field]).toBeNull();
      });

      it.each([
        '', 'not-a-date', '2026-02-30T10:00:00Z', '2025-02-29T10:00:00Z',
        '2026-09-27T25:00:00Z', '2026-09-27', '2026-09-27T10:00:00', 123,
      ])('rejects invalid date %j without writing', async (value) => {
        const before = structuredClone(stored);
        await call(operation).send({ ...editable, [field]: value }).expect(400);
        expect(writes).toHaveLength(0);
        expect(stored).toEqual(before);
      });
    });

    it('requires Admin authentication', async () => {
      await call(operation, false).send(editable).expect(401);
      expect(writes).toHaveLength(0);
    });
  });

  it.each(['create', 'update'] as const)('sends explicit null end date through Admin serializer on %s', async (operation) => {
    const response = await api.saveNewsEvent({
      ...structuredClone(editable), id: operation === 'create' ? '' : newsId,
      eventStartAt: startTime, eventEndAt: null,
    });
    expect(requestBody(adminFetch.mock.calls[0][1])).toHaveProperty('eventEndAt', null);
    expect(writes[0].data.eventEndAt).toBeNull();
    expect(stored.eventEndAt).toBeNull();
    expect(response).toMatchObject({ eventStartAt: startTime, eventEndAt: null });
  });

  it('preserves omitted dates, author, thumbnail and content on partial update', async () => {
    const before = structuredClone(stored);
    await call('update').send({ title: 'Renamed news' }).expect(200);
    expectSafeWrite('update');
    const setClause = writes[0].sql.split(' set ')[1].split(' where ')[0];
    expect(setClause).toMatch(/^"title" = \$1, "updated_at" = \$2$/);
    expect(stored).toEqual({ ...before, title: 'Renamed news', updatedAt: expect.any(Date) });
  });

  it('also preserves omitted thumbnail and business fields through the Admin serializer on partial update', async () => {
    const before = structuredClone(stored);
    await api.saveNewsEvent({ id: newsId, title: 'Renamed news' });
    expect(adminFetch).toHaveBeenCalledOnce();
    expect(requestBody(adminFetch.mock.calls[0][1])).toEqual({ title: 'Renamed news' });
    expectSafeWrite('update');
    expect(stored).toEqual({ ...before, title: 'Renamed news', updatedAt: expect.any(Date) });
  });

  it.each(['not-a-uuid', '123', newsId.slice(1)])
    ('rejects invalid update route UUID %s before any mutation query', async (id) => {
      const before = structuredClone(stored);
      await request(app.getHttpServer()).put(`/api/news-events/${id}`)
        .set('Authorization', `Bearer ${token}`).send({ title: 'Renamed', id: newsId }).expect(400);
      expect(writes).toHaveLength(0);
      expect(stored).toEqual(before);
    });

  it.each(['draft', 'published', 'archived'])('preserves automatic create-time date without changing %s status', async (status) => {
    await call('create').send({ ...editable, type: 'news', status }).expect(201);
    expectSafeWrite('create');
    expect(stored).toMatchObject({ type: 'news', status, content: editable.content });
  });

  it('generates a slug on create without requiring client ID or timestamps', async () => {
    await call('create').send({ type: 'news', title: 'New article', thumbnailImageId: null }).expect(201);
    expectSafeWrite('create');
    expect(writes[0].data).toMatchObject({ title: 'New article', slug: 'new-article', thumbnailImageId: null });
  });
});
