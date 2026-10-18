import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getTableName, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/postgres-js';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { DRIZZLE, type DrizzleDb } from '../src/database/database.module.js';
import * as schema from '../src/database/schema.js';

type Row = Record<string, unknown>;
type NewsQuery = NonNullable<Parameters<DrizzleDb['query']['newsEvents']['findFirst']>[0]>;
const articleId = randomUUID();
const compiler = drizzle.mock({ schema });

describe('FINAL-01 B2: required VI fields on authenticated updates (isolated persistence)', () => {
  let app: INestApplication<App>;
  let token: string;
  let parent: Row;
  let translations: Row[];
  let transactionCount: number;
  const writes: Array<{ table: string; data: Row; sql: string; params: unknown[] }> = [];
  const admin = { id: randomUUID(), fullName: 'VI validation Admin', email: 'audit@example.invalid', role: 'admin', status: 'active', deletedAt: null, tokenVersion: 0 };
  const persistence = {
    update: (table: PgTable) => ({ set: (data: Row) => ({ where: (condition: SQL) => {
      const compiled = compiler.update(table).set(data).where(condition).returning().toSQL();
      const name = getTableName(table);
      writes.push({ table: name, data: structuredClone(data), ...compiled });
      if (name === 'news_events') expect(compiled.params.at(-1)).toBe(articleId);
      else expect(compiled.params.at(-1)).toMatch(/^(vi|en)$/);
      const target = name === 'news_events' ? parent : translations.find(row => row.locale === compiled.params.at(-1));
      if (name === 'news_event_translations') expect(compiled.params.at(-2)).toBe(articleId);
      if (target) Object.assign(target, Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)));
      const result = Promise.resolve(target ? [{ ...target }] : []);
      return Object.assign(result, { returning: () => result });
    } }) }),
    query: {
      users: { findFirst: () => Promise.resolve(admin) },
      newsEvents: { findFirst: (options: NewsQuery) => {
        expect(compiler.query.newsEvents.findFirst(options).toSQL().params).toContain(articleId);
        return Promise.resolve({ ...parent, translations: structuredClone(translations), author: null });
      } },
    },
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService).useValue(new ConfigService({ JWT_SECRET: randomBytes(48).toString('base64url'), JWT_TTL_SECONDS: '3600' }))
      .overrideProvider(DRIZZLE).useValue({ ...persistence, transaction: async (cb: (tx: typeof persistence) => Promise<unknown>) => {
        transactionCount++;
        return cb(persistence);
      } }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    token = await module.get(JwtService).signAsync({ sub: admin.id, tokenVersion: admin.tokenVersion });
  });
  beforeEach(() => {
    parent = { id: articleId, type: 'news', status: 'published', title: 'Authored VI title', slug: 'authored-vi-slug' };
    translations = [
      { id: randomUUID(), newsEventId: articleId, locale: 'vi', title: parent.title, slug: parent.slug },
      { id: randomUUID(), newsEventId: articleId, locale: 'en', title: 'Authored EN title', slug: 'authored-en-slug' },
    ];
    writes.length = 0;
    transactionCount = 0;
  });
  afterAll(async () => { await app.close(); });
  const update = (body: Row) => request(app.getHttpServer()).put(`/api/news-events/${articleId}`)
    .set('Authorization', `Bearer ${token}`).send(body);

  describe.each(['legacy', 'translation'] as const)('%s VI payload', (shape) => {
    it.each([
      { field: 'title', value: '' }, { field: 'title', value: '   ' },
      { field: 'title', value: null }, { field: 'title', value: 42 },
      { field: 'slug', value: '' }, { field: 'slug', value: '   ' },
      { field: 'slug', value: null }, { field: 'slug', value: 42 },
    ])('rejects supplied $field=$value before opening a write transaction', async ({ field, value }) => {
      const before = structuredClone({ parent, translations });
      const vi = { [field]: value };
      await update(shape === 'legacy' ? vi : { translations: { vi } }).expect(400);
      expect(transactionCount).toBe(0);
      expect(writes).toHaveLength(0);
      expect({ parent, translations }).toEqual(before);
    });

    it('trims valid supplied VI fields and mirrors them while leaving EN untouched', async () => {
      const enBefore = structuredClone(translations[1]);
      const vi = { title: '  Updated VI  ', slug: '  updated-vi  ' };
      const response = await update(shape === 'legacy' ? vi : { translations: { vi } }).expect(200);
      expect(parent).toMatchObject({ title: 'Updated VI', slug: 'updated-vi' });
      expect(translations[0]).toMatchObject({ title: 'Updated VI', slug: 'updated-vi' });
      expect(response.body.translations.vi).toMatchObject({ title: 'Updated VI', slug: 'updated-vi' });
      expect(translations[1]).toEqual(enBefore);
      expect(writes).toHaveLength(2);
    });
  });

  it('preserves both translations when common fields alone change', async () => {
    const before = structuredClone(translations);
    await update({ status: 'draft' }).expect(200);
    expect(translations).toEqual(before);
    expect(parent).toMatchObject({ status: 'draft', title: 'Authored VI title', slug: 'authored-vi-slug' });
    expect(writes).toHaveLength(1);
  });
  it('updates EN while preserving required VI fields', async () => {
    const viBefore = structuredClone(translations[0]);
    const response = await update({ translations: { en: { title: 'New EN title', slug: 'new-en-slug' } } }).expect(200);
    expect(translations[0]).toEqual(viBefore);
    expect(parent).toMatchObject({ title: 'Authored VI title', slug: 'authored-vi-slug' });
    expect(response.body.translations.en).toMatchObject({ title: 'New EN title', slug: 'new-en-slug' });
  });
  it('preserves VI slug when only VI title is supplied', async () => {
    await update({ translations: { vi: { title: 'New VI title' } } }).expect(200);
    expect(parent).toMatchObject({ title: 'New VI title', slug: 'authored-vi-slug' });
    expect(translations[0]).toMatchObject({ title: 'New VI title', slug: 'authored-vi-slug' });
  });
  it('preserves VI title when only VI slug is supplied', async () => {
    await update({ translations: { vi: { slug: 'new-vi-slug' } } }).expect(200);
    expect(parent).toMatchObject({ title: 'Authored VI title', slug: 'new-vi-slug' });
    expect(translations[0]).toMatchObject({ title: 'Authored VI title', slug: 'new-vi-slug' });
  });
});
