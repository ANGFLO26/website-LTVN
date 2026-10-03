import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(new URL('../../api/package.json', import.meta.url));
require('reflect-metadata');
const { Test } = require('@nestjs/testing');
const request = require('supertest');
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
process.env.DATABASE_URL = 'postgresql://qa:qa@127.0.0.1:1/isolated';
const { AppModule } = await import('../../api/dist/app.module.js');
const { DRIZZLE } = await import('../../api/dist/database/database.module.js');
const schema = await import('../../api/dist/database/schema.js');
const { sanitizeUuid } = await import('../../api/dist/common/uuid.util.js');
const serviceDefinitions = [
  ['machines', 'MachinesService', 'machines'],
  ['news-events', 'NewsEventsService', 'newsEvents'],
  ['contacts', 'ContactsService', 'contacts'],
  ['users', 'UsersService', 'users'],
  ['media', 'MediaService', 'mediaAssets'],
  ['standards', 'StandardsService', 'standards'],
];
const services = [];
for (const [route, symbol, table] of serviceDefinitions) {
  const exports = await import(`../../api/dist/modules/${route}/${route}.service.js`);
  services.push({ route, table, Service: exports[symbol] });
}
const output = path.resolve('artifacts/qa-2026-09-26'); await fs.mkdir(output, { recursive: true });
const results = [];
const record = (name, passed, detail) => { const r = { name, passed, detail }; results.push(r); console.log(JSON.stringify(r)); };
const fakeId = '99999999-9999-4999-8999-999999999999';
const queryOptions = {};
const client = postgres(process.env.DATABASE_URL, { connect_timeout: 1 });
const sqlDb = drizzle(client, { schema });
const compiled = [];
const fakeDb = {
  query: Object.fromEntries(services.map(({ table }) => [table, {
    findMany: async options => { queryOptions[table] = options; return []; },
    findFirst: async options => { queryOptions[table + 'One'] = options; return { id: fakeId }; },
  }])),
  transaction: async fn => fn(fakeDb),
  insert: table => ({ values: values => ({ returning: (...args) => { const sql = sqlDb.insert(table).values(values).returning(...args).toSQL(); compiled.push(sql); return [{ ...values, id: fakeId }]; } }) }),
  update: table => ({ set: values => ({ where: condition => ({ returning: (...args) => { const sql = sqlDb.update(table).set(values).where(condition).returning(...args).toSQL(); compiled.push(sql); return [{ ...values, id: fakeId }]; } }) }) }),
};
try {
  const payloads = JSON.parse(await fs.readFile(path.join(output, 'admin-mutation-payloads.json'), 'utf8'));
  const machineService = new services[0].Service(fakeDb);
  for (const row of payloads) {
    try { await (row.method === 'PUT' ? machineService.update(fakeId, row.body) : machineService.create(row.body)); record('Real ORM compiles admin machine ' + row.method, true, {}); }
    catch (error) { record('Real ORM compiles admin machine ' + row.method, false, { error: error.message, timestampTypes: Object.fromEntries(Object.entries(row.body).filter(([k]) => /At$/.test(k)).map(([k,v]) => [k, typeof v])) }); }
  }
} catch (error) { record('Browser captured machine payloads available', false, { error: error.message }); }
const dates = { createdAt: '2026-09-26T00:00:00.000Z', updatedAt: '2026-09-26T00:00:00.000Z' };
const entityPayloads = {
  'news-events': { id: '', title: 'QA', slug: 'qa', type: 'news', status: 'draft', publishedAt: dates.createdAt, ...dates },
  users: { id: '', email: 'qa@example.invalid', fullName: 'QA', role: 'editor', status: 'active', ...dates },
  media: { id: fakeId, fileName: 'qa.png', storageKey: 'uploads/qa.png', publicUrl: '/qa.png', mimeType: 'image/png', sizeBytes: 20, createdAt: dates.createdAt },
  standards: { id: '', code: 'QA-001', title: 'QA', ...dates },
};
for (const { route, Service } of services) {
  if (!entityPayloads[route]) continue;
  try { await new Service(fakeDb).create(entityPayloads[route]); record('Real ORM compiles admin ' + route + ' creation', true, {}); }
  catch (error) { record('Real ORM compiles admin ' + route + ' creation', false, { error: error.message }); }
}
record('UUID sanitizer omits empty ID', !('id' in sanitizeUuid({ id: '', name: 'QA' })), sanitizeUuid({ id: '', name: 'QA' }));
for (const { route, table, Service } of services.filter(s => ['news-events', 'contacts', 'machines'].includes(s.route))) {
  await new Service(fakeDb).findAll();
  const sql = sqlDb.query[table].findMany(queryOptions[table]).toSQL().sql;
  record('Sensitive fields excluded from ' + route + ' relation SQL', !sql.includes('password_hash'), { passwordHashSelected: sql.includes('password_hash') });
  if (['news-events', 'machines'].includes(route)) record('Public ' + route + ' excludes drafts at API', Boolean(queryOptions[table].where), { hasWhere: Boolean(queryOptions[table].where) });
}

const serviceCalls = [];
let builder = Test.createTestingModule({ imports: [AppModule] }).overrideProvider(DRIZZLE).useValue(fakeDb);
for (const { Service, route } of services) {
  const stub = Object.fromEntries(['findAll', 'findOne', 'create', 'update', 'delete'].map(method => [method, (...args) => { serviceCalls.push({ route, method, args }); return method === 'findAll' ? [{ id: fakeId, marker: 'QA fake record' }] : { id: fakeId, success: true }; }]));
  builder = builder.overrideProvider(Service).useValue(stub);
}
const module = await builder.compile(); const app = module.createNestApplication({ logger: false }); app.setGlobalPrefix('api'); app.enableCors(); await app.init();
try {
  for (const { route } of services) {
    const read = await request(app.getHttpServer()).get('/api/' + route);
    if (['users', 'contacts'].includes(route)) record('Anonymous access blocked for ' + route, [401, 403].includes(read.status), { status: read.status });
    if (route !== 'contacts') {
      const create = await request(app.getHttpServer()).post('/api/' + route).send({});
      record('Anonymous creation blocked for ' + route, [401, 403].includes(create.status), { status: create.status, reachedService: serviceCalls.some(c => c.route === route && c.method === 'create') });
    }
    const deletion = await request(app.getHttpServer()).delete('/api/' + route + '/' + fakeId);
    record('Anonymous deletion blocked for ' + route, [401, 403].includes(deletion.status), { status: deletion.status, reachedService: serviceCalls.some(c => c.route === route && c.method === 'delete') });
  }
  const before = serviceCalls.length;
  const invalid = await request(app.getHttpServer()).post('/api/contacts').send({ fullName: '', email: 'abc', message: '', status: 'resolved', adminNote: 'QA external supplied field' });
  record('Public contact input and admin fields validated', invalid.status === 400 && serviceCalls.length === before, { status: invalid.status, forwardedBody: serviceCalls.at(-1) });
  const cors = await request(app.getHttpServer()).options('/api/users').set('Origin', 'https://qa-untrusted.invalid').set('Access-Control-Request-Method', 'POST');
  record('API rejects unlisted CORS origin', cors.headers['access-control-allow-origin'] !== '*', { status: cors.status, allowOrigin: cors.headers['access-control-allow-origin'] });
} finally { await app.close(); await client.end(); await fs.writeFile(path.join(output, 'api-results.json'), JSON.stringify(results, null, 2)); }
