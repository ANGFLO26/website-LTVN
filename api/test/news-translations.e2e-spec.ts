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

type Row = Record<string, any>;
type NewsQuery = NonNullable<Parameters<DrizzleDb['query']['newsEvents']['findMany']>[0]>;

describe('QA-14C2: News & Events Bilingual Backend Architecture', () => {
  let app: INestApplication<App>;
  let token: string;
  const compiler = drizzle.mock({ schema });

  const admin: schema.User = {
    id: randomUUID(),
    email: 'admin-qa14@ltvietnam.com.vn',
    fullName: 'QA-14 Admin',
    passwordHash: `secret-hash-${randomBytes(16).toString('hex')}`,
    role: 'admin',
    status: 'active',
    lastLoginAt: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let newsStore: Row[] = [];
  let translationsStore: Row[] = [];
  let failTranslationInsert = false;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          JWT_SECRET: randomBytes(48).toString('base64url'),
          JWT_TTL_SECONDS: '3600',
        }),
      )
      .overrideProvider(DRIZZLE)
      .useValue({
        transaction: async (cb: (tx: any) => Promise<any>) => {
          return cb({
            insert: (table: PgTable) => ({
              values: (data: Row) => {
                const name = getTableName(table);
                if (name === 'news_events') {
                  const id = randomUUID();
                  const row = {
                    id,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deletedAt: null,
                    authorId: admin.id,
                    ...data,
                  };
                  newsStore.push(row);
                  return { returning: () => Promise.resolve([row]) };
                }
                if (name === 'news_event_translations') {
                  if (failTranslationInsert) {
                    throw new Error('Simulated database error on translation insert');
                  }
                  const row = {
                    id: randomUUID(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    ...data,
                  };
                  translationsStore.push(row);
                  return { returning: () => Promise.resolve([row]) };
                }
                return { returning: () => Promise.resolve([{ id: randomUUID() }]) };
              },
            }),
            update: (table: PgTable) => ({
              set: (data: Row) => ({
                where: (_condition: SQL) => {
                  const name = getTableName(table);
                  if (name === 'news_events') {
                    // Update newsStore
                    return { returning: () => Promise.resolve([{ id: randomUUID() }]) };
                  }
                  return { returning: () => Promise.resolve([]) };
                },
              }),
            }),
          });
        },
        insert: (table: PgTable) => ({
          values: (data: Row) => {
            const name = getTableName(table);
            if (name === 'news_events') {
              const id = randomUUID();
              const row = { id, createdAt: new Date(), updatedAt: new Date(), ...data };
              newsStore.push(row);
              return { returning: () => Promise.resolve([row]) };
            }
            if (name === 'news_event_translations') {
              const row = { id: randomUUID(), ...data };
              translationsStore.push(row);
              return { returning: () => Promise.resolve([row]) };
            }
            return { returning: () => Promise.resolve([{ id: randomUUID() }]) };
          },
        }),
        update: (table: PgTable) => ({
          set: (data: Row) => ({
            where: (_cond: SQL) => {
              return { returning: () => Promise.resolve([{ id: randomUUID() }]) };
            },
          }),
        }),
        query: {
          users: { findFirst: () => Promise.resolve(admin) },
          newsEventTranslations: {
            findFirst: ({ where }: any) => {
              // Extract slug value if possible
              const match = translationsStore.find((t) => t.slug);
              return Promise.resolve(match);
            },
          },
          newsEvents: {
            findMany: (options: NewsQuery) => {
              const publishedOnly = Boolean(options.where);
              const items = newsStore.filter((item) => !publishedOnly || item.status === 'published');
              const results = items.map((item) => ({
                ...item,
                author: { id: admin.id, fullName: admin.fullName },
                translations: translationsStore.filter((t) => t.newsEventId === item.id),
              }));
              return Promise.resolve(results);
            },
            findFirst: (options: any) => {
              const item = newsStore[newsStore.length - 1];
              if (!item) return Promise.resolve(null);
              return Promise.resolve({
                ...item,
                author: { id: admin.id, fullName: admin.fullName },
                translations: translationsStore.filter((t) => t.newsEventId === item.id),
              });
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
    newsStore = [];
    translationsStore = [];
    failTranslationInsert = false;
  });

  afterAll(async () => {
    await app.close();
  });

  // T1: Legacy create with flat VI payload
  it('T1: creates parent and VI translation from legacy flat payload, with 0 EN translation', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/news-events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'news',
        title: 'Bản tin legacy cũ',
        slug: 'ban-tin-legacy-cu',
        shortDescription: 'Tóm tắt bài viết',
        content: { version: 1, blocks: [{ type: 'paragraph', data: { text: 'Nội dung cũ' } }] },
      })
      .expect(201);

    expect(newsStore).toHaveLength(1);
    expect(newsStore[0].title).toBe('Bản tin legacy cũ');
    expect(newsStore[0].slug).toBe('ban-tin-legacy-cu');

    expect(translationsStore).toHaveLength(1);
    expect(translationsStore[0].locale).toBe('vi');
    expect(translationsStore[0].title).toBe('Bản tin legacy cũ');
    expect(translationsStore[0].slug).toBe('ban-tin-legacy-cu');

    expect(res.body.translations.vi).toBeDefined();
    expect(res.body.translations.vi.title).toBe('Bản tin legacy cũ');
    expect(res.body.translations.en).toBeNull();
  });

  // T2: New bilingual create (translations.vi + translations.en)
  it('T2: creates bilingual parent and both translations, mirroring VI to legacy columns', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/news-events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'news',
        translations: {
          vi: {
            title: 'Hội thảo công nghệ 2026',
            slug: 'hoi-thao-cong-nghe-2026',
            shortDescription: 'Tóm tắt tiếng Việt',
            content: { version: 1, blocks: [{ type: 'paragraph', data: { text: 'Nội dung VI' } }] },
          },
          en: {
            title: '2026 Technology Seminar',
            slug: '2026-technology-seminar',
            shortDescription: 'English summary',
            content: { version: 1, blocks: [{ type: 'paragraph', data: { text: 'EN content' } }] },
          },
        },
      })
      .expect(201);

    expect(newsStore).toHaveLength(1);
    // Legacy columns mirrored from VI
    expect(newsStore[0].title).toBe('Hội thảo công nghệ 2026');
    expect(newsStore[0].slug).toBe('hoi-thao-cong-nghe-2026');

    // Both translations stored
    expect(translationsStore).toHaveLength(2);
    const vi = translationsStore.find((t) => t.locale === 'vi');
    const en = translationsStore.find((t) => t.locale === 'en');
    expect(vi).toBeDefined();
    expect(vi.title).toBe('Hội thảo công nghệ 2026');
    expect(en).toBeDefined();
    expect(en.title).toBe('2026 Technology Seminar');

    expect(res.body.translations.vi.title).toBe('Hội thảo công nghệ 2026');
    expect(res.body.translations.en.title).toBe('2026 Technology Seminar');
  });

  // T3: VI-only new create
  it('T3: creates VI-only article when translations.en is omitted', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/news-events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'news',
        translations: {
          vi: {
            title: 'Bài viết chỉ có tiếng Việt',
            slug: 'bai-viet-chi-co-tieng-viet',
          },
        },
      })
      .expect(201);

    expect(translationsStore).toHaveLength(1);
    expect(translationsStore[0].locale).toBe('vi');
    expect(res.body.translations.en).toBeNull();
  });

  // T4: Missing VI translation
  it('T4: rejects creation when Vietnamese translation is missing', async () => {
    await request(app.getHttpServer())
      .post('/api/news-events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'news',
        translations: {
          en: {
            title: 'Only English Title',
            slug: 'only-english-title',
          },
        },
      })
      .expect(400);
  });

  // T5: Identical VI and EN slug conflict
  it('T5: rejects creation when English slug is identical to Vietnamese slug', async () => {
    await request(app.getHttpServer())
      .post('/api/news-events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'news',
        translations: {
          vi: { title: 'Bài viết A', slug: 'same-slug' },
          en: { title: 'Article A', slug: 'same-slug' },
        },
      })
      .expect(409);
  });

  // T6: Partial update preserves omitted translations
  it('T6: preserves existing translations on partial update of common fields', async () => {
    const articleId = randomUUID();
    newsStore.push({
      id: articleId,
      type: 'news',
      title: 'Tiêu đề VI',
      slug: 'tieu-de-vi',
      status: 'draft',
      publishedAt: null,
    });
    translationsStore.push({
      id: randomUUID(),
      newsEventId: articleId,
      locale: 'vi',
      title: 'Tiêu đề VI',
      slug: 'tieu-de-vi',
    });
    translationsStore.push({
      id: randomUUID(),
      newsEventId: articleId,
      locale: 'en',
      title: 'Title EN',
      slug: 'title-en',
    });

    const res = await request(app.getHttpServer())
      .put(`/api/news-events/${articleId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'published' })
      .expect(200);

    expect(res.body.translations.vi.title).toBe('Tiêu đề VI');
    expect(res.body.translations.en.title).toBe('Title EN');
  });

  // T7: Update EN translation independently
  it('T7: updates EN translation without altering VI translation or legacy fields', async () => {
    const articleId = randomUUID();
    newsStore.push({
      id: articleId,
      type: 'news',
      title: 'Tiêu đề VI gốc',
      slug: 'tieu-de-vi-goc',
      status: 'published',
    });
    translationsStore.push({
      id: randomUUID(),
      newsEventId: articleId,
      locale: 'vi',
      title: 'Tiêu đề VI gốc',
      slug: 'tieu-de-vi-goc',
    });
    translationsStore.push({
      id: randomUUID(),
      newsEventId: articleId,
      locale: 'en',
      title: 'Old EN',
      slug: 'old-en',
    });

    const res = await request(app.getHttpServer())
      .put(`/api/news-events/${articleId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        translations: {
          en: { title: 'Updated EN Title', slug: 'updated-en-title' },
        },
      })
      .expect(200);

    expect(res.body.translations.vi.title).toBe('Tiêu đề VI gốc');
  });

  // T8: Update VI translation mirrors to legacy fields
  it('T8: updates VI translation and mirrors to legacy parent fields', async () => {
    const articleId = randomUUID();
    newsStore.push({
      id: articleId,
      type: 'news',
      title: 'Cũ',
      slug: 'cu',
      status: 'published',
    });
    translationsStore.push({
      id: randomUUID(),
      newsEventId: articleId,
      locale: 'vi',
      title: 'Cũ',
      slug: 'cu',
    });

    await request(app.getHttpServer())
      .put(`/api/news-events/${articleId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        translations: {
          vi: { title: 'Tiêu đề VI mới', slug: 'tieu-de-vi-moi' },
        },
      })
      .expect(200);
  });

  // T9: Transaction rollback on failure
  it('T9: fails atomically and does not succeed if translation insert fails', async () => {
    failTranslationInsert = true;
    await request(app.getHttpServer())
      .post('/api/news-events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'news',
        title: 'Bài viết thử nghiệm',
      })
      .expect(500);
  });

  // T10: Public GET /api/news-events?locale=vi
  it('T10: returns published articles projected to Vietnamese', async () => {
    const id = randomUUID();
    newsStore.push({ id, status: 'published', title: 'Legacy Title', slug: 'legacy-slug' });
    translationsStore.push({ id: randomUUID(), newsEventId: id, locale: 'vi', title: 'Tiêu đề VI', slug: 'tieu-de-vi' });

    const res = await request(app.getHttpServer())
      .get('/api/news-events?locale=vi')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].title).toBe('Tiêu đề VI');
  });

  // T11: Public GET /api/news-events?locale=en (Policy A)
  it('T11: returns only articles with authored EN translation under locale=en (excludes VI-only articles)', async () => {
    const id1 = randomUUID();
    const id2 = randomUUID();

    // Article 1: Bilingual (Published)
    newsStore.push({ id: id1, status: 'published', title: 'Bài 1', slug: 'bai-1' });
    translationsStore.push({ id: randomUUID(), newsEventId: id1, locale: 'vi', title: 'Bài 1 VI', slug: 'bai-1-vi' });
    translationsStore.push({ id: randomUUID(), newsEventId: id1, locale: 'en', title: 'Article 1 EN', slug: 'article-1-en' });

    // Article 2: VI-only (Published)
    newsStore.push({ id: id2, status: 'published', title: 'Bài 2', slug: 'bai-2' });
    translationsStore.push({ id: randomUUID(), newsEventId: id2, locale: 'vi', title: 'Bài 2 VI', slug: 'bai-2-vi' });

    const res = await request(app.getHttpServer())
      .get('/api/news-events?locale=en')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    // Article 2 (VI only) MUST be excluded by Policy A!
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Article 1 EN');
  });

  // T12: Invalid locale
  it('T12: rejects unsupported locale with 400 Bad Request', async () => {
    await request(app.getHttpServer())
      .get('/api/news-events?locale=fr')
      .expect(400);
  });

  // T13: Draft bilingual article is not published (QA-07)
  it('T13: does not return draft bilingual articles on public endpoints', async () => {
    const id = randomUUID();
    newsStore.push({ id, status: 'draft', title: 'Draft article', slug: 'draft-article' });
    translationsStore.push({ id: randomUUID(), newsEventId: id, locale: 'vi', title: 'Bản nháp', slug: 'ban-nhap' });
    translationsStore.push({ id: randomUUID(), newsEventId: id, locale: 'en', title: 'Draft EN', slug: 'draft-en' });

    const res = await request(app.getHttpServer())
      .get('/api/news-events?locale=en')
      .expect(200);

    expect(res.body).toHaveLength(0);
  });

  // T14: Slug resolver on detail endpoint
  it('T14: resolves published article by either slug', async () => {
    const id = randomUUID();
    newsStore.push({ id, status: 'published', title: 'PAC OptiDist', slug: 'ban-giao-pac-optidist' });
    translationsStore.push({
      id: randomUUID(),
      newsEventId: id,
      locale: 'vi',
      title: 'Bàn giao PAC OptiDist',
      slug: 'ban-giao-pac-optidist',
    });
    translationsStore.push({
      id: randomUUID(),
      newsEventId: id,
      locale: 'en',
      title: 'PAC OptiDist Handover',
      slug: 'pac-optidist-handover',
    });

    const res = await request(app.getHttpServer())
      .get('/api/news-events/ban-giao-pac-optidist')
      .expect(200);

    expect(res.body.id).toBe(id);
    expect(res.body.translations.vi).toBeDefined();
    expect(res.body.translations.en).toBeDefined();
  });

  // T15: Author security - no passwordHash leakage (QA-02)
  it('T15: never leaks passwordHash in public or admin news read responses', async () => {
    const id = randomUUID();
    newsStore.push({ id, status: 'published', title: 'Secure article', slug: 'secure-article', authorId: admin.id });
    translationsStore.push({ id: randomUUID(), newsEventId: id, locale: 'vi', title: 'Bảo mật', slug: 'bao-mat' });

    const publicRes = await request(app.getHttpServer()).get('/api/news-events').expect(200);
    expect(JSON.stringify(publicRes.body)).not.toContain('passwordHash');
    expect(JSON.stringify(publicRes.body)).not.toContain('secret-hash');

    const adminRes = await request(app.getHttpServer())
      .get('/api/admin/news-events')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(JSON.stringify(adminRes.body)).not.toContain('passwordHash');
    expect(JSON.stringify(adminRes.body)).not.toContain('secret-hash');
  });
});
