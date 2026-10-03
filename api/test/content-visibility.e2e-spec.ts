import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { drizzle } from 'drizzle-orm/postgres-js';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { DRIZZLE, type DrizzleDb } from '../src/database/database.module.js';
import * as schema from '../src/database/schema.js';

type MachineQuery = NonNullable<Parameters<DrizzleDb['query']['machines']['findMany']>[0]>;
type NewsQuery = NonNullable<Parameters<DrizzleDb['query']['newsEvents']['findMany']>[0]>;
type CompiledQuery = { sql: string; params: unknown[] };
type Resource = 'machines' | 'news-events';
type ContentRecord = { id: string; slug: string; status: string; title: string; name: string };

const statuses = ['published', 'draft', 'archived'] as const;
const admin: schema.User = {
  id: randomUUID(), email: `${randomUUID()}@example.invalid`, fullName: 'QA-07 Admin',
  passwordHash: `private-fixture-${randomBytes(24).toString('hex')}`,
  role: 'admin', status: 'active', lastLoginAt: null, deletedAt: null,
  createdAt: new Date(), updatedAt: new Date(),
};
const datasets: Record<Resource, ContentRecord[]> = {
  machines: statuses.map((status) => ({
    id: randomUUID(), slug: `machine-${status}`, status, name: `Machine ${status}`, title: `Machine ${status}`,
  })),
  'news-events': statuses.map((status) => ({
    id: randomUUID(), slug: `news-${status}`, status, name: `News ${status}`, title: `News ${status}`,
  })),
};

describe('QA-07: published public reads and authenticated Admin reads', () => {
  let app: INestApplication<App>;
  let token: string;
  const queries: CompiledQuery[] = [];
  // No database connection: compile actual service queries with the installed ORM.
  const queryBuilder = drizzle.mock({ schema });

  function equality(query: CompiledQuery, alias: string, column: string) {
    const match = new RegExp(`"${alias}"\\."${column}" = \\$(\\d+)`).exec(query.sql);
    return match ? query.params[Number(match[1]) - 1] : undefined;
  }

  // Evaluate the equality predicates emitted by the real query builder against
  // three fixture records. An omitted publication/lookup predicate returns extra
  // records, causing the HTTP assertions to fail. No real SQL is executed.
  function select(resource: Resource, query: CompiledQuery) {
    queries.push(query);
    const alias = resource === 'machines' ? 'machines' : 'newsEvents';
    return datasets[resource].filter((record) => (
      (['id', 'slug', 'status'] as const).every((column) => {
        const value = equality(query, alias, column);
        return value === undefined || record[column] === value;
      })
    ));
  }

  function machineResult(options: MachineQuery, single: boolean) {
    const query = single
      ? queryBuilder.query.machines.findFirst(options)
      : queryBuilder.query.machines.findMany(options);
    const records = select('machines', query.toSQL());
    return Promise.resolve(single ? records[0] : records);
  }

  function newsResult(options: NewsQuery, single: boolean) {
    const query = single
      ? queryBuilder.query.newsEvents.findFirst(options)
      : queryBuilder.query.newsEvents.findMany(options);
    const selection = options.with?.author;
    const columns = selection && selection !== true ? selection.columns : undefined;
    const author = columns
      ? Object.fromEntries(Object.entries(admin).filter(([key]) => columns[key as keyof schema.User] === true))
      : { ...admin };
    const records = select('news-events', query.toSQL()).map((record) => ({ ...record, author }));
    return Promise.resolve(single ? records[0] : records);
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService).useValue(new ConfigService({
        JWT_SECRET: randomBytes(48).toString('base64url'), JWT_TTL_SECONDS: '3600',
      }))
      .overrideProvider(DRIZZLE).useValue({
        query: {
          users: { findFirst: () => Promise.resolve(admin) },
          machines: {
            findMany: (options: MachineQuery) => machineResult(options, false),
            findFirst: (options: MachineQuery) => machineResult(options, true),
          },
          newsEvents: {
            findMany: (options: NewsQuery) => newsResult(options, false),
            findFirst: (options: NewsQuery) => newsResult(options, true),
          },
        },
      })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    token = await module.get(JwtService).signAsync({ sub: admin.id });
  });

  beforeEach(() => { queries.length = 0; });
  afterAll(async () => { await app.close(); });

  function expectPublishedQuery(resource: Resource, lookup?: { field: string; value: string }) {
    expect(queries).toHaveLength(1);
    const query = queries[0];
    const alias = resource === 'machines' ? 'machines' : 'newsEvents';
    // The outer WHERE must restrict the base record, not just a joined relation.
    const outerWhere = query.sql.slice(query.sql.lastIndexOf(' where '));
    const statusParameter = query.params.indexOf('published') + 1;
    expect(statusParameter).toBeGreaterThan(0);
    expect(outerWhere).toContain(`"${alias}"."status" = $${statusParameter}`);
    expect(outerWhere).not.toMatch(/\bor\b/);
    if (lookup) {
      const lookupParameter = query.params.indexOf(lookup.value) + 1;
      expect(lookupParameter).toBeGreaterThan(0);
      expect(outerWhere).toContain(`"${alias}"."${lookup.field}" = $${lookupParameter}`);
      expect(outerWhere).toContain(' and ');
    }
  }

  function expectSafeAuthor(resource: Resource, body: Record<string, unknown>) {
    if (resource === 'news-events') {
      expect(body.author).toEqual({ id: admin.id, fullName: admin.fullName });
      expect(JSON.stringify(body)).not.toContain('passwordHash');
      expect(JSON.stringify(body)).not.toContain(admin.passwordHash);
      expect(queries[0].sql).not.toContain('password_hash');
    }
  }

  describe.each(['machines', 'news-events'] as const)('%s', (resource) => {
    const records = datasets[resource];
    const details = records.flatMap((record) => (['id', 'slug'] as const).map((field) => ({ record, field })));
    const missingLookups = [randomUUID(), 'missing-record'];

    it.each([false, true])('public list returns only published (Admin token: %s)', async (authenticated) => {
      const call = request(app.getHttpServer()).get(`/api/${resource}`);
      if (authenticated) call.set('Authorization', `Bearer ${token}`);
      const response = await call.expect(200);
      const body = response.body as Record<string, unknown>[];
      expect(body.map((record) => record.id)).toEqual([records[0].id]);
      expect(body.map((record) => record.status)).toEqual(['published']);
      expectPublishedQuery(resource);
      expectSafeAuthor(resource, body[0]);
    });

    it('public list cannot opt into non-public records using query parameters', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/${resource}?status=draft&includeAll=true`).expect(200);
      expect((response.body as ContentRecord[]).map((record) => record.id)).toEqual([records[0].id]);
      expectPublishedQuery(resource);
    });

    it.each(details)('public $record.status detail by $field enforces visibility in SQL', async ({ record, field }) => {
      const response = await request(app.getHttpServer()).get(`/api/${resource}/${record[field]}`)
        .expect(record.status === 'published' ? 200 : 404);
      expectPublishedQuery(resource, { field, value: record[field] });
      if (record.status === 'published') {
        expect(response.body).toMatchObject({ id: record.id, status: 'published' });
        expectSafeAuthor(resource, response.body as Record<string, unknown>);
      } else {
        expect(response.text).not.toContain(record.title);
        expect(response.body).not.toHaveProperty('status');
        expect(response.body).not.toHaveProperty('author');
      }
    });

    it.each(missingLookups)('public missing detail %s returns 404', async (lookup) => {
      await request(app.getHttpServer()).get(`/api/${resource}/${lookup}`).expect(404);
      expectPublishedQuery(resource);
    });

    it('an Admin token cannot expose a draft through a public detail URL', async () => {
      await request(app.getHttpServer()).get(`/api/${resource}/${records[1].id}`)
        .set('Authorization', `Bearer ${token}`).expect(404);
      expectPublishedQuery(resource, { field: 'id', value: records[1].id });
    });

    it('authenticated Admin list includes all three statuses', async () => {
      const response = await request(app.getHttpServer()).get(`/api/admin/${resource}`)
        .set('Authorization', `Bearer ${token}`).expect(200);
      const body = response.body as Record<string, unknown>[];
      expect(body.map((record) => record.status)).toEqual(statuses);
      expect(body.map((record) => record.id)).toEqual(records.map((record) => record.id));
      expect(queries).toHaveLength(1);
      expect(queries[0].params).not.toContain('published');
      for (const record of body) expectSafeAuthor(resource, record);
    });

    it.each(details)('authenticated Admin reads $record.status detail by $field', async ({ record, field }) => {
      const response = await request(app.getHttpServer()).get(`/api/admin/${resource}/${record[field]}`)
        .set('Authorization', `Bearer ${token}`).expect(200);
      expect(response.body).toMatchObject({ id: record.id, status: record.status });
      expect(queries).toHaveLength(1);
      expect(queries[0].params).toContain(record[field]);
      expect(queries[0].params).not.toContain('published');
      expectSafeAuthor(resource, response.body as Record<string, unknown>);
    });

    it.each(['', `/${records[1].id}`, `/${records[2].slug}`])('anonymous Admin read %s returns 401 before querying content', async (suffix) => {
      await request(app.getHttpServer()).get(`/api/admin/${resource}${suffix}`).expect(401);
      expect(queries).toHaveLength(0);
    });

    it.each(missingLookups)('authenticated Admin missing detail %s returns 404', async (lookup) => {
      await request(app.getHttpServer()).get(`/api/admin/${resource}/${lookup}`)
        .set('Authorization', `Bearer ${token}`).expect(404);
    });
  });
});
