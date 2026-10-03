import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getTableName } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/postgres-js';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  createSourceFile, forEachChild, isIdentifier, isVariableDeclaration,
  ModuleKind, type Node, ScriptKind, ScriptTarget, transpileModule,
} from 'typescript';
import { AppModule } from '../src/app.module.js';
import { DRIZZLE } from '../src/database/database.module.js';
import * as schema from '../src/database/schema.js';
import { MediaService } from '../src/modules/media/media.service.js';

type Row = Record<string, unknown>;
type Write = { data: Row; sql: string; params: unknown[] };
const mediaId = randomUUID();
const clientId = randomUUID();
const clientTime = '2020-01-02T03:04:05.000Z';
const editable = {
  fileName: 'instrument.jpg', storageKey: 'uploads/instrument.jpg',
  publicUrl: '/assets/instrument.jpg', altText: 'Instrument photo',
  mimeType: 'image/jpeg', sizeBytes: 150000, width: 1200, height: 800,
};
const metadata = {
  id: clientId, createdAt: clientTime, updatedAt: clientTime, deletedAt: clientTime,
  uploadedBy: randomUUID(), uploadedByUser: { id: randomUUID(), fullName: 'Client supplied user' },
};

function requestBody(options?: RequestInit): Row {
  if (typeof options?.body !== 'string') throw new Error('Expected a JSON request body');
  return JSON.parse(options.body) as Row;
}

// Execute the real browser serializer with isolated storage and an in-process HTTP transport.
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
    saveMedia: (asset: Row) => Promise<unknown>;
  };
}

// Run the actual form handler without a DOM; fail if it generates request identity/metadata.
function submitMediaForm(newAsset: Row) {
  const source = readFileSync(new URL('../../admin/src/pages/MediaPage.tsx', import.meta.url), 'utf8');
  const file = createSourceFile('MediaPage.tsx', source, ScriptTarget.ES2023, true, ScriptKind.TSX);
  let handler: string | undefined;
  function visit(node: Node) {
    if (isVariableDeclaration(node) && isIdentifier(node.name) && node.name.text === 'handleCreate') {
      handler = node.initializer?.getText(file);
    }
    forEachChild(node, visit);
  }
  visit(file);
  if (!handler) throw new Error('Media form handler not found');
  const onSave = vi.fn();
  const generateId = vi.fn(() => { throw new Error('Form must not generate an ID'); });
  const compiled = transpileModule(`(${handler})();`, {
    compilerOptions: { target: ScriptTarget.ES2023 },
  });
  runInNewContext(compiled.outputText, {
    newAsset, onSave, setIsModalOpen: () => {}, setNewAsset: () => {},
    crypto: { randomUUID: generateId },
  });
  expect(generateId).not.toHaveBeenCalled();
  expect(onSave).toHaveBeenCalledOnce();
  return onSave.mock.calls[0][0] as Row;
}

describe('QA-03 Media: create payload and database-owned identity/timestamps', () => {
  let app: INestApplication<App>;
  let token: string;
  let service: MediaService;
  const writes: Write[] = [];
  const compiler = drizzle.mock({ schema });
  const actor = {
    id: randomUUID(), email: 'media-admin@example.invalid', fullName: 'Media Admin',
    role: 'admin', status: 'active', deletedAt: null,
  };
  const adminFetch = vi.fn(async (url: string, options?: RequestInit): Promise<Response> => {
    const response = await request(app.getHttpServer()).post(url)
      .set('Authorization', `Bearer ${token}`).send(requestBody(options));
    return new Response(JSON.stringify(response.body), { status: response.status });
  });
  const api = loadAdminApi(adminFetch);

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService).useValue(new ConfigService({
        JWT_SECRET: randomBytes(48).toString('base64url'), JWT_TTL_SECONDS: '3600',
      }))
      .overrideProvider(DRIZZLE).useValue({
        // Only compile SQL. The fixture response simulates database defaults, with no connection.
        insert: (table: PgTable) => ({
          values: (data: Row) => ({
            returning: () => {
              expect(getTableName(table)).toBe('media_assets');
              const query = compiler.insert(table).values(data).returning().toSQL();
              writes.push({ data, ...query });
              return Promise.resolve([{
                ...data, id: mediaId, createdAt: new Date(), uploadedBy: null, deletedAt: null,
              }]);
            },
          }),
        }),
        query: { users: { findFirst: () => Promise.resolve(actor) } },
      })
      .compile();
    service = module.get(MediaService);
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    token = await module.get(JwtService).signAsync({ sub: actor.id });
  });

  beforeEach(() => { writes.length = 0; adminFetch.mockClear(); });
  afterAll(async () => { await app.close(); });

  function post() {
    return request(app.getHttpServer()).post('/api/media').set('Authorization', `Bearer ${token}`);
  }

  function expectSafeWrite(fields: Row) {
    expect(writes).toHaveLength(1);
    const write = writes[0];
    const defined = Object.fromEntries(Object.entries(write.data).filter(([, value]) => value !== undefined));
    expect(defined).toEqual(fields);
    for (const field of Object.keys(metadata)) expect(write.data).not.toHaveProperty(field);
    expect(write.params).not.toContain(clientId);
    expect(write.params).not.toContain(clientTime);
    expect(write.params).not.toContain(metadata.uploadedBy);

    // Verify the real compiled INSERT uses database DEFAULT for each system column.
    const match = write.sql.match(/insert into "media_assets" \((.*?)\) values \((.*?)\) returning/);
    expect(match).not.toBeNull();
    const columns = match![1].split(', ').map((column) => column.replaceAll('"', ''));
    const values = match![2].split(', ');
    for (const column of ['id', 'created_at', 'uploaded_by', 'deleted_at']) {
      expect(values[columns.indexOf(column)]).toBe('default');
    }
  }

  it('sends only editable form fields through the actual Admin serializer and compiles the INSERT', async () => {
    const payload = submitMediaForm(editable);
    expect(payload).toEqual(editable);
    const result = await api.saveMedia(payload);
    expect(adminFetch).toHaveBeenCalledOnce();
    const [url, options] = adminFetch.mock.calls[0];
    expect(url).toBe('/api/media');
    expect(options?.method).toBe('POST');
    expect(requestBody(options)).toEqual(editable);
    expectSafeWrite(editable);
    expect(result).toMatchObject({ ...editable, id: mediaId, uploadedBy: null });
    expect(result).toHaveProperty('createdAt');
  });

  it('excludes cached metadata from the frontend request without mutating the input', async () => {
    const input = { ...editable, ...metadata };
    const before = structuredClone(input);
    const result = await api.saveMedia(input);
    expect(input).toEqual(before);
    expect(requestBody(adminFetch.mock.calls[0][1])).toEqual(editable);
    expectSafeWrite(editable);
    expect(result).toMatchObject({ id: mediaId });
  });

  it.each(['', clientId])('ignores legacy body ID %j and system metadata at the API boundary', async (id) => {
    const response = await post().send({ ...editable, ...metadata, id }).expect(201);
    expectSafeWrite(editable);
    expect(response.body).toMatchObject({ ...editable, id: mediaId, uploadedBy: null, deletedAt: null });
    expect((response.body as Row).createdAt).not.toBe(clientTime);
  });

  it('also enforces the allowlist in the service, independent of request validation', async () => {
    const result = await service.create({ ...editable, ...metadata });
    expectSafeWrite(editable);
    expect(result.id).toBe(mediaId);
  });

  it('preserves null altText and dimensions through frontend, validation and SQL compilation', async () => {
    const fields = { ...editable, altText: null, width: null, height: null };
    const result = await api.saveMedia(fields);
    expect(requestBody(adminFetch.mock.calls[0][1])).toEqual(fields);
    expectSafeWrite(fields);
    expect(result).toMatchObject(fields);
  });

  it('accepts omitted nullable fields', async () => {
    const fields = {
      fileName: editable.fileName, storageKey: editable.storageKey, publicUrl: editable.publicUrl,
      mimeType: editable.mimeType, sizeBytes: editable.sizeBytes,
    };
    await post().send(fields).expect(201);
    expectSafeWrite(fields);
  });

  it('keeps numeric values and units, including zero, without coercion or defaults in the API', async () => {
    const fields = { ...editable, sizeBytes: 0, width: 0, height: 0 };
    await post().send(fields).expect(201);
    expectSafeWrite(fields);
  });

  it.each(['fileName', 'storageKey', 'publicUrl', 'mimeType', 'sizeBytes'])
    ('rejects missing required field %s before Drizzle', async (field) => {
      const fields: Row = { ...editable };
      delete fields[field];
      await post().send(fields).expect(400);
      expect(writes).toHaveLength(0);
    });

  it.each([
    ['fileName', 123], ['storageKey', {}], ['publicUrl', []], ['mimeType', null], ['altText', false],
    ['sizeBytes', '150000'], ['sizeBytes', 1.5], ['sizeBytes', null],
    ['width', '1200'], ['height', 1.5],
    ['fileName', 'x'.repeat(256)], ['altText', 'x'.repeat(256)], ['mimeType', 'x'.repeat(101)],
  ])('rejects incorrect type or schema length for %s (%j)', async (field, value) => {
    await post().send({ ...editable, [field as string]: value }).expect(400);
    expect(writes).toHaveLength(0);
  });

  it('still requires ADMIN authentication for create', async () => {
    await request(app.getHttpServer()).post('/api/media').send(editable).expect(401);
    expect(writes).toHaveLength(0);
  });
});
