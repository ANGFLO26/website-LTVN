import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getTableColumns } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { DRIZZLE, type DrizzleDb } from '../src/database/database.module.js';
import * as schema from '../src/database/schema.js';

type NewsQuery = NonNullable<Parameters<DrizzleDb['query']['newsEvents']['findMany']>[0]>;
type ContactQuery = NonNullable<Parameters<DrizzleDb['query']['contacts']['findMany']>[0]>;
type UserSelection = true | { columns?: Partial<Record<keyof schema.User, boolean>> };

const user: schema.User = {
  id: randomUUID(),
  fullName: 'Relation Test User',
  email: `${randomUUID()}@example.invalid`,
  passwordHash: `private-test-hash-${randomBytes(24).toString('hex')}`,
  role: 'admin',
  status: 'active',
  lastLoginAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};
const news = { id: randomUUID(), slug: 'qa02-news', title: 'QA-02 news', status: 'published', authorId: user.id };
const contact = { id: randomUUID(), fullName: 'Visitor', message: 'QA-02 contact', assignedTo: user.id };

describe('QA-02: safe user relations (real controllers/services/guard, isolated persistence)', () => {
  let app: INestApplication<App>;
  let token: string;
  let relatedUser: schema.User | null;
  let missingRecord = false;
  const queries: { sql: string; selection: UserSelection | undefined }[] = [];

  // Compiles SQL using the installed ORM and real schema, without a database client.
  const queryBuilder = drizzle.mock({ schema });

  // Emulate the database's column selection against a fixture containing all user fields.
  // Selecting the entire relation deliberately returns secrets, so a regression fails.
  function selectUser(selection: UserSelection | undefined) {
    if (!relatedUser) return null;
    if (!selection || selection === true || !selection.columns) return { ...relatedUser };
    const columns = selection.columns;
    const includes = Object.values(columns).some((value) => value === true);
    return Object.fromEntries(Object.entries(relatedUser).filter(([key]) => (
      includes ? columns[key as keyof schema.User] === true : columns[key as keyof schema.User] !== false
    )));
  }

  function newsResult(options: NewsQuery, single: boolean) {
    const query = single
      ? queryBuilder.query.newsEvents.findFirst(options)
      : queryBuilder.query.newsEvents.findMany(options);
    queries.push({ sql: query.toSQL().sql, selection: options.with?.author });
    const result = { ...news, authorId: relatedUser?.id ?? null, author: selectUser(options.with?.author) };
    return Promise.resolve(single ? (missingRecord ? undefined : result) : (missingRecord ? [] : [result]));
  }

  function contactResult(options: ContactQuery, single: boolean) {
    const query = single
      ? queryBuilder.query.contacts.findFirst(options)
      : queryBuilder.query.contacts.findMany(options);
    queries.push({ sql: query.toSQL().sql, selection: options.with?.assignedUser });
    const result = { ...contact, assignedTo: relatedUser?.id ?? null, assignedUser: selectUser(options.with?.assignedUser) };
    return Promise.resolve(single ? (missingRecord ? undefined : result) : (missingRecord ? [] : [result]));
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService).useValue(new ConfigService({
        JWT_SECRET: randomBytes(48).toString('base64url'), JWT_TTL_SECONDS: '3600',
      }))
      .overrideProvider(DRIZZLE).useValue({
        query: {
          users: { findFirst: () => Promise.resolve(user) },
          newsEvents: {
            findMany: (options: NewsQuery) => newsResult(options, false),
            findFirst: (options: NewsQuery) => newsResult(options, true),
          },
          contacts: {
            findMany: (options: ContactQuery) => contactResult(options, false),
            findFirst: (options: ContactQuery) => contactResult(options, true),
          },
        },
      })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    token = await module.get(JwtService).signAsync({ sub: user.id });
  });

  beforeEach(() => {
    relatedUser = user;
    missingRecord = false;
    queries.length = 0;
  });

  afterAll(async () => { await app.close(); });

  const routes = [
    { path: '/api/news-events', relation: 'author', alias: 'newsEvents_author', list: true, public: true },
    { path: `/api/news-events/${news.id}`, relation: 'author', alias: 'newsEvents_author', list: false, public: true },
    { path: `/api/news-events/${news.slug}`, relation: 'author', alias: 'newsEvents_author', list: false, public: true },
    { path: '/api/admin/news-events', relation: 'author', alias: 'newsEvents_author', list: true, public: false },
    { path: `/api/admin/news-events/${news.id}`, relation: 'author', alias: 'newsEvents_author', list: false, public: false },
    { path: `/api/admin/news-events/${news.slug}`, relation: 'author', alias: 'newsEvents_author', list: false, public: false },
    { path: '/api/contacts', relation: 'assignedUser', alias: 'contacts_assignedUser', list: true, public: false },
    { path: `/api/contacts/${contact.id}`, relation: 'assignedUser', alias: 'contacts_assignedUser', list: false, public: false },
  ];

  function get(path: string, isPublic: boolean) {
    const call = request(app.getHttpServer()).get(path);
    return isPublic ? call : call.set('Authorization', `Bearer ${token}`);
  }

  it.each(routes)('GET $path exposes only the user identity allowlist', async (route) => {
    const response = await get(route.path, route.public).expect(200);
    const body = response.body as Record<string, unknown> | Record<string, unknown>[];
    const item = Array.isArray(body) ? body[0] : body;
    expect(Array.isArray(body)).toBe(route.list);
    expect(item[route.relation]).toEqual({ id: user.id, fullName: user.fullName });
    expect(response.text).not.toContain('passwordHash');
    expect(response.text).not.toContain('password_hash');
    expect(response.text).not.toContain(user.passwordHash);
    expect(response.text).not.toContain(user.email);

    expect(queries).toHaveLength(1);
    expect(queries[0].selection).toEqual({ columns: { id: true, fullName: true } });
    // Check the SQL itself: no forbidden user columns may be fetched, even if later hidden.
    for (const [key, column] of Object.entries(getTableColumns(schema.users))) {
      const reference = `"${route.alias}"."${column.name}"`;
      if (key === 'id' || key === 'fullName') {
        expect(queries[0].sql).toContain(reference);
      } else {
        expect(queries[0].sql).not.toContain(reference);
      }
    }
    expect(queries[0].sql).not.toContain('password_hash');
  });

  it.each(routes)('GET $path accepts a null user relation', async (route) => {
    relatedUser = null;
    const response = await get(route.path, route.public).expect(200);
    const body = response.body as Record<string, unknown> | Record<string, unknown>[];
    const item = Array.isArray(body) ? body[0] : body;
    expect(item[route.relation]).toBeNull();
    expect(response.text).not.toContain('passwordHash');
  });

  it.each(routes)('GET $path preserves empty/missing record behavior', async (route) => {
    missingRecord = true;
    const response = await get(route.path, route.public).expect(route.list ? 200 : 404);
    if (route.list) expect(response.body).toEqual([]);
  });

  it.each(routes.filter((route) => !route.public))('GET $path still rejects anonymous requests', async (route) => {
    await request(app.getHttpServer()).get(route.path).expect(401);
    expect(queries).toHaveLength(0);
  });
});
