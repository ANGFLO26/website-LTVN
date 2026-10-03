import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { randomBytes, randomUUID } from 'node:crypto';
const requireApi = createRequire(path.resolve('api/package.json'));
requireApi('reflect-metadata');
const { Test } = requireApi('@nestjs/testing');
const { ConfigService } = requireApi('@nestjs/config');
const { JwtService } = requireApi('@nestjs/jwt');
const { getTableName } = requireApi('drizzle-orm');
const request = requireApi('supertest');
const { AppModule } = await import(pathToFileURL(path.resolve('api/dist/app.module.js')));
const { DRIZZLE } = await import(pathToFileURL(path.resolve('api/dist/database/database.module.js')));
const id = randomUUID();
const admin = { id: randomUUID(), role: 'admin', status: 'active', deletedAt: null, email: 'audit@example.invalid', fullName: 'Audit Admin' };
const parent = { id, title: 'VI required before update', slug: 'vi-required-before-update', type: 'news', status: 'published' };
const vi = { id: randomUUID(), newsEventId: id, locale: 'vi', title: parent.title, slug: parent.slug };
const writes = [];
const db = {
  transaction: async cb => cb(db),
  update: table => ({ set: data => ({ where: () => {
    const name = getTableName(table);
    writes.push({ table: name, fields: data });
    Object.assign(name === 'news_events' ? parent : vi, data);
    const result = Promise.resolve([name === 'news_events' ? parent : vi]);
    result.returning = () => result;
    return result;
  } }) }),
  query: {
    users: { findFirst: async () => admin },
    newsEvents: { findFirst: async () => ({ ...parent, translations: [{ ...vi }], author: null }) },
  },
};
const module = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(ConfigService).useValue(new ConfigService({ JWT_SECRET: randomBytes(48).toString('base64url'), JWT_TTL_SECONDS: '3600' }))
  .overrideProvider(DRIZZLE).useValue(db).compile();
const app = module.createNestApplication();
app.setGlobalPrefix('api');
await app.init();
try {
  const token = await module.get(JwtService).signAsync({ sub: admin.id });
  const cases = [];
  for (const translation of [{ title: '', slug: 'valid-vi-slug' }, { title: '   ', slug: '' }]) {
    const response = await request(app.getHttpServer()).put('/api/news-events/' + id)
      .set('Authorization', 'Bearer ' + token).send({ translations: { vi: translation } });
    cases.push({ payload: translation, status: response.status, resultingVi: response.body.translations?.vi, resultingParent: { title: response.body.title, slug: response.body.slug } });
    assert.equal(response.status, 200);
    assert.equal(response.body.translations.vi.title, translation.title);
    assert.equal(response.body.translations.vi.slug, translation.slug);
  }
  const result = { id: 'FINAL-01-B2', severity: 'P2', environment: 'Compiled Nest API/global JWT guard; DRIZZLE overridden with in-memory capture; no PostgreSQL',
    expected: 'Reject supplied blank VI title/slug with 400, preserving existing required VI content',
    actual: 'Authenticated PUT returns 200 and writes empty/whitespace title and empty slug to parent and VI translation', cases, writes };
  fs.writeFileSync('artifacts/final-01-2026-10-03/vi-update-proof.json', JSON.stringify(result,null,2));
  console.log('CONFIRMED FINAL-01-B2: authenticated PUT accepts blank VI title/slug and writes them to both tables.');
} finally { await app.close(); }
