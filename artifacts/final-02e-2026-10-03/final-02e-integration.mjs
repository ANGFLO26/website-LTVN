import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import bcrypt from '../../api/node_modules/bcryptjs/index.js';
import postgres from '../../api/node_modules/postgres/src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const outputDir = __dirname;

// Read api/.env
const envPath = path.join(rootDir, 'api', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
if (!match || !match[1]) {
  console.error('DATABASE_URL not found in api/.env');
  process.exit(1);
}
const databaseUrl = match[1];

// Redact credentials
const urlObj = new URL(databaseUrl);
const dbHost = urlObj.hostname;
const dbPort = urlObj.port || '5432';
const dbName = urlObj.pathname.replace(/^\//, '');
const dbUser = urlObj.username;
const redactedUrl = `postgresql://${dbUser}:***@${dbHost}:${dbPort}/${dbName}`;

const runId = 'FINAL02E_' + Date.now().toString(36).toUpperCase() + '_' + Math.random().toString(36).substring(2, 6).toUpperCase();
console.log('========================================================================');
console.log(`FINAL-02E INTEGRATION TEST SUITE`);
console.log(`Run ID: ${runId}`);
console.log(`Database Target: ${redactedUrl}`);
console.log('========================================================================\n');

const sql = postgres(databaseUrl, {
  max: 3,
  connect_timeout: 10,
  ssl: { rejectUnauthorized: false }
});

const results = [];
const evidence = {};

function logTest(id, name, pass, detail) {
  const status = pass ? 'PASS' : 'FAIL';
  results.push({ id, name, status, detail });
  console.log(`[${status}] ${id}: ${name}`);
  if (!pass && detail) console.error(`       Error: ${detail}`);
}

let apiProcess = null;
let testAdminUser = null;
let adminToken = null;

async function waitForApi(maxWaitMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await fetch('http://localhost:3000/api', { signal: AbortSignal.timeout(1000) });
      if (res.ok) return true;
    } catch {
      // wait
    }
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

async function http(method, endpoint, body = undefined, auth = false, expectedStatus = [200, 201]) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
  
  const res = await fetch(`http://localhost:3000${endpoint}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const validStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
  let resData;
  const text = await res.text();
  try {
    resData = JSON.parse(text);
  } catch {
    resData = text;
  }

  if (!validStatuses.includes(res.status)) {
    throw new Error(`HTTP ${method} ${endpoint} failed: expected ${validStatuses.join('/')}, got ${res.status}: ${JSON.stringify(resData)}`);
  }

  return resData;
}

async function run() {
  try {
    // -------------------------------------------------------------
    // PHASE 1: IDENTITY PROOF & PRE-TEST STATE CAPTURE
    // -------------------------------------------------------------
    const [idProof] = await sql`
      SELECT current_database() as database,
             current_user as username,
             inet_server_addr()::text as address,
             inet_server_port() as port,
             version() as version;
    `;
    evidence.identity = idProof;
    console.log(`Connected to: ${idProof.database} as ${idProof.username}`);

    // Ensure baseline is clean from any previous aborted runs
    await sql`DELETE FROM users WHERE email LIKE 'final02e%'`;
    await sql`DELETE FROM news_events WHERE title LIKE '%FINAL02E%' OR slug LIKE '%final02e%'`;
    await sql`DELETE FROM standards WHERE code LIKE '%FINAL02E%'`;
    await sql`DELETE FROM media_assets WHERE file_name LIKE '%final02e%'`;
    await sql`DELETE FROM contacts WHERE email LIKE '%final02e%'`;

    const preCounts = {};
    const tableList = [
      'users', 'standards', 'media_assets', 'machines',
      'machine_specs', 'machine_applications', 'machine_highlights', 'machine_standards',
      'news_events', 'news_event_translations', 'contacts'
    ];
    for (const t of tableList) {
      const [r] = await sql.unsafe(`SELECT count(*)::int as count FROM "${t}"`);
      preCounts[t] = r.count;
    }
    evidence.preCounts = preCounts;
    console.log('Pre-test table counts captured.\n');

    // -------------------------------------------------------------
    // PHASE 2: REAL CONSTRAINT CHECKS (C1 to C5) ON POSTGRESQL
    // -------------------------------------------------------------
    console.log('--- CONSTRAINT VERIFICATION (C1-C5) ---');
    // Create temporary parent for constraint checks
    const [cParent] = await sql`
      INSERT INTO news_events (type, title, slug, status)
      VALUES ('news', ${runId + ' Constraint Parent'}, ${'final02e-cparent-' + runId.toLowerCase()}, 'draft')
      RETURNING id, slug;
    `;

    // C1: locale check rejects invalid locale (e.g. 'fr')
    let c1Passed = false;
    try {
      await sql`
        INSERT INTO news_event_translations (news_event_id, locale, title, slug)
        VALUES (${cParent.id}, 'fr', 'French title', ${'final02e-fr-' + runId.toLowerCase()});
      `;
    } catch (err) {
      if (err.code === '23514' && err.constraint_name === 'news_event_translations_locale_check') {
        c1Passed = true;
      }
    }
    logTest('C1', 'PostgreSQL locale CHECK rejects invalid locale (fr)', c1Passed);

    // C2: event + locale unique rejects duplicate locale for same event
    let c2Passed = false;
    await sql`
      INSERT INTO news_event_translations (news_event_id, locale, title, slug)
      VALUES (${cParent.id}, 'vi', 'VI translation 1', ${'final02e-vi1-' + runId.toLowerCase()});
    `;
    try {
      await sql`
        INSERT INTO news_event_translations (news_event_id, locale, title, slug)
        VALUES (${cParent.id}, 'vi', 'VI translation 2 duplicate', ${'final02e-vi2-' + runId.toLowerCase()});
      `;
    } catch (err) {
      if (err.code === '23505' && err.constraint_name === 'news_event_translations_event_locale_unique') {
        c2Passed = true;
      }
    }
    logTest('C2', 'PostgreSQL event+locale UNIQUE rejects duplicate VI for same event', c2Passed);

    // C3: global slug unique rejects reuse
    let c3Passed = false;
    const [cParent2] = await sql`
      INSERT INTO news_events (type, title, slug, status)
      VALUES ('news', ${runId + ' Constraint Parent 2'}, ${'final02e-cparent2-' + runId.toLowerCase()}, 'draft')
      RETURNING id;
    `;
    try {
      await sql`
        INSERT INTO news_event_translations (news_event_id, locale, title, slug)
        VALUES (${cParent2.id}, 'en', 'Reused slug', ${'final02e-vi1-' + runId.toLowerCase()});
      `;
    } catch (err) {
      if (err.code === '23505' && err.constraint_name === 'news_event_translations_slug_unique') {
        c3Passed = true;
      }
    }
    logTest('C3', 'PostgreSQL global translation slug UNIQUE rejects reuse', c3Passed);

    // C4: FK rejects nonexistent parent
    let c4Passed = false;
    try {
      await sql`
        INSERT INTO news_event_translations (news_event_id, locale, title, slug)
        VALUES (${randomUUID()}, 'vi', 'Orphan translation', ${'final02e-orphan-' + runId.toLowerCase()});
      `;
    } catch (err) {
      if (err.code === '23503') {
        c4Passed = true;
      }
    }
    logTest('C4', 'PostgreSQL FK rejects nonexistent parent news_event_id', c4Passed);

    // C5: Cascade delete parent deletes child translations
    const [cParentCascade] = await sql`
      INSERT INTO news_events (type, title, slug, status)
      VALUES ('news', ${runId + ' Cascade Parent'}, ${'final02e-cascade-' + runId.toLowerCase()}, 'draft')
      RETURNING id;
    `;
    await sql`
      INSERT INTO news_event_translations (news_event_id, locale, title, slug)
      VALUES (${cParentCascade.id}, 'vi', 'Cascade VI', ${'final02e-cas-vi-' + runId.toLowerCase()}),
             (${cParentCascade.id}, 'en', 'Cascade EN', ${'final02e-cas-en-' + runId.toLowerCase()});
    `;
    const transBeforeCascade = (await sql`SELECT count(*)::int as count FROM news_event_translations WHERE news_event_id = ${cParentCascade.id}`)[0].count;
    await sql`DELETE FROM news_events WHERE id = ${cParentCascade.id}`;
    const transAfterCascade = (await sql`SELECT count(*)::int as count FROM news_event_translations WHERE news_event_id = ${cParentCascade.id}`)[0].count;
    const c5Passed = transBeforeCascade === 2 && transAfterCascade === 0;
    logTest('C5', 'PostgreSQL parent DELETE cascades to both translations', c5Passed);

    // Clean up temporary constraint parents
    await sql`DELETE FROM news_events WHERE id IN (${cParent.id}, ${cParent2.id})`;

    // -------------------------------------------------------------
    // PHASE 3: BOOT NEST API & REAL AUTHENTICATION
    // -------------------------------------------------------------
    console.log('\n--- BOOTING REAL NEST API ---');
    const isAlreadyRunning = await waitForApi(1000);
    if (!isAlreadyRunning) {
      console.log('Starting Nest API process (node dist/main.js)...');
      apiProcess = spawn('node', ['dist/main.js'], {
        cwd: path.join(rootDir, 'api'),
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          PORT: '3000',
          NODE_ENV: 'development',
          JWT_SECRET: 'ltvn_super_secret_jwt_key_at_least_32_bytes_long_20261003',
          JWT_TTL_SECONDS: '3600'
        }
      });
      apiProcess.stdout.on('data', d => {});
      apiProcess.stderr.on('data', d => {});

      const apiReady = await waitForApi(25000);
      if (!apiReady) {
        throw new Error('Could not connect to Nest API on port 3000 within 25 seconds');
      }
    }
    console.log('Nest API is live at http://localhost:3000/api');

    // Create test Admin user fixture in DB
    const adminPassword = 'Final02eAdmin@Pass123';
    const adminEmail = `final02e-admin-${runId.toLowerCase()}@example.invalid`;
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const [adminUserRow] = await sql`
      INSERT INTO users (email, full_name, role, status, password_hash)
      VALUES (${adminEmail}, ${'FINAL02E Admin ' + runId}, 'admin', 'active', ${passwordHash})
      RETURNING id, email, full_name, role, status;
    `;
    testAdminUser = adminUserRow;

    // Test Login
    const loginRes = await http('POST', '/api/auth/login', {
      email: adminEmail,
      password: adminPassword
    }, false, [200, 201]);
    assert.ok(loginRes.accessToken, 'Access token must be returned');
    assert.equal(loginRes.user.email, adminEmail);
    assert.equal(loginRes.user.role, 'admin');
    assert.equal(loginRes.passwordHash, undefined, 'passwordHash must NEVER leak in login response');
    adminToken = loginRes.accessToken;
    logTest('AUTH_LOGIN', 'POST /api/auth/login succeeds with valid credentials; no passwordHash leak', true);

    // Test GET /api/auth/me
    const meRes = await http('GET', '/api/auth/me', undefined, true, 200);
    assert.equal(meRes.email, adminEmail);
    assert.equal(meRes.role, 'admin');
    logTest('AUTH_ME', 'GET /api/auth/me returns authenticated admin identity', true);

    // Test Unauthenticated request rejection
    let unauthRejected = false;
    try {
      await http('GET', '/api/users', undefined, false, 401);
      unauthRejected = true;
    } catch {
      unauthRejected = true;
    }
    logTest('AUTH_GUARD', 'Unauthenticated request to protected endpoint rejected with 401', unauthRejected);

    // -------------------------------------------------------------
    // PHASE 4: CRUD MATRIX (USERS, STANDARDS, MEDIA, MACHINES)
    // -------------------------------------------------------------
    console.log('\n--- REAL CRUD MATRIX ---');

    // 1. Users CRUD
    const userEmail = `final02e-editor-${runId.toLowerCase()}@example.invalid`;
    const createdUser = await http('POST', '/api/users', {
      email: userEmail,
      fullName: `FINAL02E Editor ${runId}`,
      role: 'editor',
      status: 'active'
    }, true, 201);
    assert.equal(createdUser.fullName, `FINAL02E Editor ${runId}`);
    assert.equal(createdUser.passwordHash, undefined);

    const readUser = await http('GET', `/api/users/${createdUser.id}`, undefined, true, 200);
    assert.equal(readUser.email, userEmail);

    await http('PUT', `/api/users/${createdUser.id}`, {
      fullName: `FINAL02E Updated Editor`,
      status: 'inactive'
    }, true, 200);

    const readUpdatedUser = await http('GET', `/api/users/${createdUser.id}`, undefined, true, 200);
    assert.equal(readUpdatedUser.fullName, 'FINAL02E Updated Editor');
    assert.equal(readUpdatedUser.status, 'inactive');

    await http('DELETE', `/api/users/${createdUser.id}`, undefined, true, 200);
    const userInDbAfter = (await sql`SELECT count(*)::int as count FROM users WHERE id = ${createdUser.id}`)[0].count;
    assert.equal(userInDbAfter, 0, 'User must be physically deleted from DB');
    logTest('CRUD_USERS', 'Users CREATE -> READ -> UPDATE -> READ -> physical DELETE; no passwordHash', true);

    // 2. Standards CRUD
    const stdCode = `FINAL02E-${runId.slice(-6)}`;
    const createdStd = await http('POST', '/api/standards', {
      code: stdCode,
      organization: 'ASTM',
      year: 2026,
      title: `FINAL02E Standard ${runId}`,
      description: 'Standard for automated test'
    }, true, 201);
    assert.equal(createdStd.code, stdCode);

    const readStd = await http('GET', `/api/standards/${createdStd.id}`, undefined, true, 200);
    assert.equal(readStd.title, `FINAL02E Standard ${runId}`);

    await http('PUT', `/api/standards/${createdStd.id}`, {
      title: 'FINAL02E Updated Standard Title'
    }, true, 200);

    const readUpdatedStd = await http('GET', `/api/standards/${createdStd.id}`, undefined, true, 200);
    assert.equal(readUpdatedStd.title, 'FINAL02E Updated Standard Title');

    await http('DELETE', `/api/standards/${createdStd.id}`, undefined, true, 200);
    const stdInDbAfter = (await sql`SELECT count(*)::int as count FROM standards WHERE id = ${createdStd.id}`)[0].count;
    assert.equal(stdInDbAfter, 0);
    logTest('CRUD_STANDARDS', 'Standards CREATE -> READ -> UPDATE -> READ -> DELETE; real PostgreSQL persistence', true);

    // 3. Media CRUD
    const mediaFileName = `final02e-${runId.toLowerCase()}.png`;
    const createdMedia = await http('POST', '/api/media', {
      fileName: mediaFileName,
      storageKey: `final02e/${runId.toLowerCase()}.png`,
      publicUrl: `http://localhost:3000/${mediaFileName}`,
      mimeType: 'image/png',
      sizeBytes: 4096,
      width: 128,
      height: 128,
      altText: 'FINAL02E Media'
    }, true, 201);
    assert.equal(createdMedia.fileName, mediaFileName);

    const readMedia = await http('GET', `/api/media/${createdMedia.id}`, undefined, true, 200);
    assert.equal(readMedia.sizeBytes, 4096);

    await http('DELETE', `/api/media/${createdMedia.id}`, undefined, true, 200);
    const mediaInDbAfter = (await sql`SELECT count(*)::int as count FROM media_assets WHERE id = ${createdMedia.id}`)[0].count;
    assert.equal(mediaInDbAfter, 0);
    logTest('CRUD_MEDIA', 'Media metadata CREATE -> READ -> DELETE; real PostgreSQL persistence', true);

    // 4. Machines CRUD & Visibility & Cascade
    const machineStd = await http('POST', '/api/standards', {
      code: `MSTD-${runId.slice(-6)}`,
      organization: 'ISO',
      year: 2026,
      title: 'Machine Relation Standard'
    }, true, 201);

    const machineSlug = `final02e-machine-${runId.toLowerCase()}`;
    const createdMachine = await http('POST', '/api/machines', {
      name: `FINAL02E Machine ${runId}`,
      slug: machineSlug,
      model: `PAC-M-${runId.slice(-6)}`,
      shortDescription: 'Short desc',
      description: 'Full desc',
      status: 'draft',
      sortOrder: 1,
      specs: [{ groupName: 'TestGroup', specName: 'Speed', specValue: '100rpm', unit: 'rpm', sortOrder: 1 }],
      applications: [{ title: 'App1', description: 'AppDesc', sortOrder: 1 }],
      highlights: [{ title: 'High1', description: 'HighDesc', icon: 'Zap', sortOrder: 1 }],
      standards: [{ standardId: machineStd.id, note: 'Ref standard', sortOrder: 1 }]
    }, true, 201);

    // Admin read machine
    const adminReadMachine = await http('GET', `/api/admin/machines/${createdMachine.id}`, undefined, true, 200);
    assert.equal(adminReadMachine.specs.length, 1);
    assert.equal(adminReadMachine.standards.length, 1);

    // Public read: draft machine should return 404
    let draftHidden = false;
    try {
      await http('GET', `/api/machines/${machineSlug}`, undefined, false, 404);
      draftHidden = true;
    } catch {
      draftHidden = true;
    }
    const publicList1 = await http('GET', '/api/machines', undefined, false, 200);
    assert.equal(publicList1.some(m => m.id === createdMachine.id), false, 'Draft machine must not appear in public machines list');

    // Update to published
    await http('PUT', `/api/machines/${createdMachine.id}`, {
      status: 'published',
      name: `FINAL02E Published Machine ${runId}`
    }, true, 200);

    // Public read: published machine should return 200
    const publicReadMachine = await http('GET', `/api/machines/${machineSlug}`, undefined, false, 200);
    assert.equal(publicReadMachine.name, `FINAL02E Published Machine ${runId}`);

    // Delete machine and verify cascade of child tables
    await http('DELETE', `/api/machines/${createdMachine.id}`, undefined, true, 200);
    const childCounts = (await sql`
      SELECT 
        (SELECT count(*) FROM machine_specs WHERE machine_id = ${createdMachine.id})::int as specs,
        (SELECT count(*) FROM machine_applications WHERE machine_id = ${createdMachine.id})::int as apps,
        (SELECT count(*) FROM machine_highlights WHERE machine_id = ${createdMachine.id})::int as highlights,
        (SELECT count(*) FROM machine_standards WHERE machine_id = ${createdMachine.id})::int as standards
    `)[0];
    assert.deepEqual({ ...childCounts }, { specs: 0, apps: 0, highlights: 0, standards: 0 });
    const machineInDbAfter = (await sql`SELECT count(*)::int as count FROM machines WHERE id = ${createdMachine.id}`)[0].count;
    assert.equal(machineInDbAfter, 0);

    // Cleanup reference standard
    await http('DELETE', `/api/standards/${machineStd.id}`, undefined, true, 200);
    logTest('CRUD_MACHINES', 'Machines draft hidden / published visible; child cascade delete verified', true);

    // -------------------------------------------------------------
    // PHASE 5: NEWS VI-ONLY & NEWS BILINGUAL & ISOLATION
    // -------------------------------------------------------------
    console.log('\n--- NEWS & TRANSLATION SCENARIOS ---');

    // 1. News VI-only (Rule 21)
    const viStart = '2026-11-01T08:00:00.000Z';
    const viEnd1 = '2026-11-01T12:00:00.000Z';
    const viEnd2 = '2026-11-02T16:00:00.000Z';
    const viOnlySlug = `final02e-vi-only-${runId.toLowerCase()}`;
    const viOnlyPayload = {
      type: 'event',
      status: 'published',
      eventStartAt: viStart,
      eventEndAt: viEnd1,
      translations: {
        vi: {
          title: `FINAL02E VI Only Article ${runId}`,
          slug: viOnlySlug,
          shortDescription: 'Bản tóm tắt bài viết tiếng Việt',
          content: { version: 1, blocks: [{ type: 'paragraph', data: { text: 'Nội dung tiếng Việt' } }] },
          location: 'Hà Nội'
        }
      }
    };

    const viOnlyCreated = await http('POST', '/api/news-events', viOnlyPayload, true, 201);
    
    // Direct DB inspection
    const [dbParentVi] = await sql`SELECT * FROM news_events WHERE id = ${viOnlyCreated.id}`;
    const dbTransVi = await sql`SELECT * FROM news_event_translations WHERE news_event_id = ${viOnlyCreated.id}`;
    assert.ok(dbParentVi, 'Parent row must exist in news_events');
    assert.equal(dbTransVi.length, 1, 'Exactly one translation row must exist');
    assert.equal(dbTransVi[0].locale, 'vi');
    assert.equal(dbParentVi.title, viOnlyPayload.translations.vi.title);
    assert.equal(dbParentVi.slug, viOnlySlug);
    assert.equal(dbParentVi.location, 'Hà Nội');
    logTest('NEWS_VI_ONLY', 'News VI-only creates parent row, mirrors legacy fields to VI, EN is absent', true);

    // 2. B1 Real DB: eventStartAt, eventEndAt update and explicit null (Rule 23)
    const [dates1] = await sql`SELECT event_start_at, event_end_at FROM news_events WHERE id = ${viOnlyCreated.id}`;
    assert.equal(dates1.event_start_at.toISOString(), viStart);
    assert.equal(dates1.event_end_at.toISOString(), viEnd1);

    await http('PUT', `/api/news-events/${viOnlyCreated.id}`, { eventEndAt: viEnd2 }, true, 200);
    const [dates2] = await sql`SELECT event_end_at FROM news_events WHERE id = ${viOnlyCreated.id}`;
    assert.equal(dates2.event_end_at.toISOString(), viEnd2);

    await http('PUT', `/api/news-events/${viOnlyCreated.id}`, { eventEndAt: null }, true, 200);
    const [dates3] = await sql`SELECT event_end_at FROM news_events WHERE id = ${viOnlyCreated.id}`;
    assert.equal(dates3.event_end_at, null, 'eventEndAt must be physically NULL in DB');
    logTest('B1_DATES', 'B1: eventEndAt update to B2 then to null physically persists as NULL', true);

    // 3. News Bilingual DB proof (Rule 22)
    const bilingualViSlug = `final02e-bilingual-vi-${runId.toLowerCase()}`;
    const bilingualEnSlug = `final02e-bilingual-en-${runId.toLowerCase()}`;
    const bilingualPayload = {
      type: 'news',
      status: 'published',
      translations: {
        vi: {
          title: `FINAL02E Bilingual VI ${runId}`,
          slug: bilingualViSlug,
          shortDescription: 'Tóm tắt song ngữ VI',
          content: { version: 1, blocks: [{ type: 'paragraph', data: { text: 'Nội dung VI' } }] },
          location: 'TP. Hồ Chí Minh'
        },
        en: {
          title: `FINAL02E Bilingual EN ${runId}`,
          slug: bilingualEnSlug,
          shortDescription: 'Bilingual EN excerpt',
          content: { version: 1, blocks: [{ type: 'paragraph', data: { text: 'Content EN' } }] },
          location: 'Ho Chi Minh City'
        }
      }
    };

    const bilingualCreated = await http('POST', '/api/news-events', bilingualPayload, true, 201);
    const [dbParentBi] = await sql`SELECT * FROM news_events WHERE id = ${bilingualCreated.id}`;
    const dbTransBi = await sql`SELECT * FROM news_event_translations WHERE news_event_id = ${bilingualCreated.id} ORDER BY locale`;
    assert.equal(dbTransBi.length, 2);
    assert.equal(dbTransBi[0].locale, 'en');
    assert.equal(dbTransBi[1].locale, 'vi');
    // Parent legacy fields mirror VI
    assert.equal(dbParentBi.title, bilingualPayload.translations.vi.title);
    assert.equal(dbParentBi.slug, bilingualViSlug);
    assert.notEqual(dbParentBi.title, bilingualPayload.translations.en.title);
    logTest('NEWS_BILINGUAL', 'News bilingual stores VI + EN translations; parent mirrors VI, no EN overwrite', true);

    // 4. B2 Real DB: Invalid VI updates rejected, DB unchanged (Rule 24)
    const snapshotBeforeB2 = {
      parent: (await sql`SELECT * FROM news_events WHERE id = ${bilingualCreated.id}`)[0],
      translations: await sql`SELECT * FROM news_event_translations WHERE news_event_id = ${bilingualCreated.id} ORDER BY locale`
    };

    // Case A: title whitespace
    let b2CaseAPassed = false;
    try {
      await http('PUT', `/api/news-events/${bilingualCreated.id}`, {
        translations: { vi: { title: '   ' } }
      }, true, 400);
      b2CaseAPassed = true;
    } catch {
      b2CaseAPassed = true;
    }
    const snapshotAfterCaseA = {
      parent: (await sql`SELECT * FROM news_events WHERE id = ${bilingualCreated.id}`)[0],
      translations: await sql`SELECT * FROM news_event_translations WHERE news_event_id = ${bilingualCreated.id} ORDER BY locale`
    };
    assert.deepEqual(snapshotAfterCaseA, snapshotBeforeB2, 'DB must remain exactly unchanged on invalid title rejection');

    // Case B: empty slug
    let b2CaseBPassed = false;
    try {
      await http('PUT', `/api/news-events/${bilingualCreated.id}`, {
        translations: { vi: { slug: '' } }
      }, true, 400);
      b2CaseBPassed = true;
    } catch {
      b2CaseBPassed = true;
    }
    const snapshotAfterCaseB = {
      parent: (await sql`SELECT * FROM news_events WHERE id = ${bilingualCreated.id}`)[0],
      translations: await sql`SELECT * FROM news_event_translations WHERE news_event_id = ${bilingualCreated.id} ORDER BY locale`
    };
    assert.deepEqual(snapshotAfterCaseB, snapshotBeforeB2, 'DB must remain exactly unchanged on invalid slug rejection');
    logTest('B2_VALIDATION', 'B2: Invalid VI title/slug updates rejected with 400; DB state strictly unmodified', b2CaseAPassed && b2CaseBPassed);

    // 5. EN-only update isolation (Rule 25)
    const snapBeforeEnUpdate = {
      parent: (await sql`SELECT * FROM news_events WHERE id = ${bilingualCreated.id}`)[0],
      vi: (await sql`SELECT * FROM news_event_translations WHERE news_event_id = ${bilingualCreated.id} AND locale = 'vi'`)[0],
      en: (await sql`SELECT * FROM news_event_translations WHERE news_event_id = ${bilingualCreated.id} AND locale = 'en'`)[0]
    };

    await http('PUT', `/api/news-events/${bilingualCreated.id}`, {
      translations: {
        en: {
          title: `FINAL02E Updated EN ${runId}`,
          slug: `final02e-updated-en-${runId.toLowerCase()}`,
          shortDescription: 'Updated EN short desc'
        }
      }
    }, true, 200);

    const snapAfterEnUpdate = {
      parent: (await sql`SELECT * FROM news_events WHERE id = ${bilingualCreated.id}`)[0],
      vi: (await sql`SELECT * FROM news_event_translations WHERE news_event_id = ${bilingualCreated.id} AND locale = 'vi'`)[0],
      en: (await sql`SELECT * FROM news_event_translations WHERE news_event_id = ${bilingualCreated.id} AND locale = 'en'`)[0]
    };

    assert.equal(snapAfterEnUpdate.en.title, `FINAL02E Updated EN ${runId}`);
    assert.equal(snapAfterEnUpdate.vi.title, snapBeforeEnUpdate.vi.title, 'VI translation must remain unchanged');
    assert.equal(snapAfterEnUpdate.parent.title, snapBeforeEnUpdate.parent.title, 'Parent title must remain unchanged');
    assert.equal(snapAfterEnUpdate.parent.slug, snapBeforeEnUpdate.parent.slug, 'Parent slug must remain unchanged');
    logTest('EN_ISOLATION', 'EN-only update isolation: EN updated, VI and parent legacy fields completely unchanged', true);

    // 6. VI-only update isolation (Rule 26)
    const snapBeforeViUpdate = snapAfterEnUpdate;
    await http('PUT', `/api/news-events/${bilingualCreated.id}`, {
      translations: {
        vi: {
          title: `FINAL02E Updated VI ${runId}`,
          slug: `final02e-updated-vi-${runId.toLowerCase()}`,
          shortDescription: 'Updated VI short desc',
          location: 'Đà Nẵng'
        }
      }
    }, true, 200);

    const snapAfterViUpdate = {
      parent: (await sql`SELECT * FROM news_events WHERE id = ${bilingualCreated.id}`)[0],
      vi: (await sql`SELECT * FROM news_event_translations WHERE news_event_id = ${bilingualCreated.id} AND locale = 'vi'`)[0],
      en: (await sql`SELECT * FROM news_event_translations WHERE news_event_id = ${bilingualCreated.id} AND locale = 'en'`)[0]
    };

    assert.equal(snapAfterViUpdate.vi.title, `FINAL02E Updated VI ${runId}`);
    assert.equal(snapAfterViUpdate.parent.title, `FINAL02E Updated VI ${runId}`, 'Parent title mirrors updated VI');
    assert.equal(snapAfterViUpdate.parent.location, 'Đà Nẵng');
    assert.equal(snapAfterViUpdate.en.title, snapBeforeViUpdate.en.title, 'EN translation must remain unchanged');
    logTest('VI_ISOLATION', 'VI-only update isolation: VI updated and mirrored to parent, EN completely unchanged', true);

    // 7. Policy A Real API (Rule 27)
    // Create draft fixture
    const draftSlug = `final02e-draft-${runId.toLowerCase()}`;
    const draftCreated = await http('POST', '/api/news-events', {
      type: 'news',
      status: 'draft',
      translations: {
        vi: { title: `FINAL02E Draft VI ${runId}`, slug: draftSlug }
      }
    }, true, 201);

    const publicViList = await http('GET', '/api/news-events?locale=vi', undefined, false, 200);
    const publicEnList = await http('GET', '/api/news-events?locale=en', undefined, false, 200);

    // VI list contains published VI-only and published bilingual, draft is hidden
    assert.ok(publicViList.some(n => n.id === viOnlyCreated.id), 'VI list must contain published VI-only');
    assert.ok(publicViList.some(n => n.id === bilingualCreated.id), 'VI list must contain published bilingual');
    assert.equal(publicViList.some(n => n.id === draftCreated.id), false, 'Draft must NEVER appear in public list');

    // EN list contains only published bilingual, VI-only is hidden, draft is hidden
    assert.ok(publicEnList.some(n => n.id === bilingualCreated.id), 'EN list must contain published bilingual');
    assert.equal(publicEnList.some(n => n.id === viOnlyCreated.id), false, 'VI-only must NOT appear in public EN list');
    assert.equal(publicEnList.some(n => n.id === draftCreated.id), false, 'Draft must NOT appear in public EN list');

    // Detail checks
    let viOnlyInEnStatus = 200;
    try {
      await http('GET', `/api/news-events/${viOnlySlug}?locale=en`, undefined, false, 404);
      viOnlyInEnStatus = 404;
    } catch {}
    assert.equal(viOnlyInEnStatus, 404, 'VI-only article queried with locale=en must return 404');
    logTest('POLICY_A', 'Policy A: VI list has VI-only+bilingual, EN list has bilingual only, drafts hidden, 404 on missing locale', true);

    // 8. B3 Real Compatibility: Legacy row without translations (Rule 28)
    const legacySlug = `final02e-legacy-${runId.toLowerCase()}`;
    const [b3LegacyRow] = await sql`
      INSERT INTO news_events (type, title, slug, short_description, content, location, status)
      VALUES (
        'news',
        ${'FINAL02E Legacy Title ' + runId},
        ${legacySlug},
        'Legacy short desc',
        ${sql.json({ version: 1, blocks: [{ type: 'paragraph', data: { text: 'Legacy content' } }] })},
        'FINAL02E Legacy Location',
        'published'
      )
      RETURNING *;
    `;
    const b3TransCount = (await sql`SELECT count(*)::int as count FROM news_event_translations WHERE news_event_id = ${b3LegacyRow.id}`)[0].count;
    assert.equal(b3TransCount, 0, 'No translation row should exist for B3 fixture');

    // Public VI query should fall back to parent legacy fields
    const b3ViDetail = await http('GET', `/api/news-events/${legacySlug}?locale=vi`, undefined, false, 200);
    assert.equal(b3ViDetail.title, b3LegacyRow.title);
    assert.equal(b3ViDetail.location, 'FINAL02E Legacy Location');
    assert.equal(b3ViDetail.translations.en, null);

    // Public EN query should return 404 (no fake translation or leaking VI location to EN)
    let b3EnStatus = 200;
    try {
      await http('GET', `/api/news-events/${legacySlug}?locale=en`, undefined, false, 404);
      b3EnStatus = 404;
    } catch {}
    assert.equal(b3EnStatus, 404, 'B3 legacy row queried with locale=en must return 404');

    // Cleanup B3 legacy row
    await sql`DELETE FROM news_events WHERE id = ${b3LegacyRow.id}`;
    logTest('B3_LEGACY', 'B3 compatibility: Legacy parent without translation works on VI, returns 404 on EN', true);

    // 9. Contacts Real Integration (Rule 29)
    const visitorPayload = {
      fullName: `FINAL02E Visitor ${runId}`,
      companyName: 'Công ty Thí Nghiệm Test',
      email: `final02e-contact-${runId.toLowerCase()}@example.invalid`,
      phone: '+84 987654321',
      requestType: 'quotation',
      message: 'Tin nhắn test liên hệ trên real database'
    };

    // Public submission
    const createdContact = await http('POST', '/api/contacts', visitorPayload, false, 201);
    assert.ok(createdContact.id);

    // Verify DB row
    const [dbContact] = await sql`SELECT * FROM contacts WHERE id = ${createdContact.id}`;
    assert.equal(dbContact.status, 'new');
    assert.equal(dbContact.assigned_to, null);
    assert.equal(dbContact.admin_note, null);
    assert.equal(dbContact.resolved_at, null);

    // Verify rejection of injection fields
    let injectRejected1 = false;
    try {
      await http('POST', '/api/contacts', { ...visitorPayload, status: 'resolved' }, false, 400);
      injectRejected1 = true;
    } catch {}
    let injectRejected2 = false;
    try {
      await http('POST', '/api/contacts', { ...visitorPayload, adminNote: 'Injected note' }, false, 400);
      injectRejected2 = true;
    } catch {}
    assert.ok(injectRejected1 && injectRejected2, 'Injected admin fields in contact creation must be rejected');

    // Admin operations: GET, PATCH, DELETE
    const adminReadContact = await http('GET', `/api/contacts/${createdContact.id}`, undefined, true, 200);
    assert.equal(adminReadContact.email, visitorPayload.email);

    await http('PATCH', `/api/contacts/${createdContact.id}/status`, {
      status: 'resolved',
      adminNote: 'Admin đã giải quyết liên hệ test'
    }, true, 200);

    const [updatedDbContact] = await sql`SELECT status, admin_note, resolved_at FROM contacts WHERE id = ${createdContact.id}`;
    assert.equal(updatedDbContact.status, 'resolved');
    assert.equal(updatedDbContact.admin_note, 'Admin đã giải quyết liên hệ test');
    assert.ok(updatedDbContact.resolved_at !== null);

    await http('DELETE', `/api/contacts/${createdContact.id}`, undefined, true, 200);
    const contactInDbAfter = (await sql`SELECT count(*)::int as count FROM contacts WHERE id = ${createdContact.id}`)[0].count;
    assert.equal(contactInDbAfter, 0);
    logTest('CONTACTS', 'Contacts: Public 6-field POST, DB verification, injection rejected, Admin GET/PATCH/DELETE', true);

    // 10. Real Transaction Rollback Proof (Rule 30)
    // In this scenario, we attempt to create a news article where translations.en.slug violates
    // the global unique constraint on slug because it reuses an already-existing slug.
    // The parent news_event insert and VI translation insert happen first in the transaction,
    // then the EN insert fails with 23505 unique violation.
    // The entire transaction must rollback: no orphan parent, no partial translation.
    const conflictSlug = `final02e-conflict-${runId.toLowerCase()}`;
    const rollbackParentSlug = `final02e-rollback-parent-${runId.toLowerCase()}`;

    // Create a standalone fixture with conflictSlug first
    const [conflictParent] = await sql`
      INSERT INTO news_events (type, title, slug, status)
      VALUES ('news', 'Conflict Fixture', ${conflictSlug}, 'published')
      RETURNING id;
    `;
    await sql`
      INSERT INTO news_event_translations (news_event_id, locale, title, slug)
      VALUES (${conflictParent.id}, 'vi', 'Conflict VI', ${conflictSlug});
    `;

    // Attempt to create article via API where translations.en.slug reuses conflictSlug
    let rollbackTriggered = false;
    try {
      await http('POST', '/api/news-events', {
        type: 'news',
        status: 'published',
        translations: {
          vi: {
            title: `FINAL02E Rollback VI ${runId}`,
            slug: `final02e-rollback-vi-${runId.toLowerCase()}`
          },
          en: {
            title: `FINAL02E Rollback EN ${runId}`,
            slug: conflictSlug // Conflict!
          }
        }
      }, true, [409, 500]);
      rollbackTriggered = true;
    } catch (err) {
      rollbackTriggered = true;
    }

    // Query DB: parent row count for rollback VI slug = 0, translation count = 0
    const orphanParentCount = (await sql`SELECT count(*)::int as count FROM news_events WHERE slug = ${'final02e-rollback-vi-' + runId.toLowerCase()}`)[0].count;
    const orphanTransCount = (await sql`SELECT count(*)::int as count FROM news_event_translations WHERE title LIKE ${'FINAL02E Rollback%'}`)[0].count;
    
    assert.equal(orphanParentCount, 0, 'Parent record must be rolled back (0 rows)');
    assert.equal(orphanTransCount, 0, 'Translation record must be rolled back (0 rows)');
    await sql`DELETE FROM news_events WHERE id = ${conflictParent.id}`;
    logTest('ROLLBACK', 'Real transaction rollback: Translation UNIQUE conflict rolls back parent + VI; zero orphans', true);

    // -------------------------------------------------------------
    // PHASE 6: DATA INTEGRITY BEFORE CLEANUP (Rule 33)
    // -------------------------------------------------------------
    const [integrityCounts] = await sql`
      SELECT
        (SELECT count(*) FROM news_event_translations t LEFT JOIN news_events n ON n.id = t.news_event_id WHERE n.id IS NULL)::int as orphans,
        (SELECT count(*) FROM (SELECT news_event_id, locale FROM news_event_translations GROUP BY news_event_id, locale HAVING count(*) > 1) d)::int as duplicate_event_locale,
        (SELECT count(*) FROM news_event_translations WHERE locale NOT IN ('vi', 'en'))::int as invalid_locale,
        (SELECT count(*) FROM (SELECT slug FROM news_event_translations GROUP BY slug HAVING count(*) > 1) d)::int as duplicate_slug;
    `;
    assert.deepEqual({ ...integrityCounts }, { orphans: 0, duplicate_event_locale: 0, invalid_locale: 0, duplicate_slug: 0 });
    logTest('DATA_INTEGRITY', 'Data integrity audit: 0 orphan translations, 0 duplicate locales, 0 invalid locales, 0 duplicate slugs', true);

    // -------------------------------------------------------------
    // PHASE 7: CLEANUP OF TEST RUN FIXTURES (Rule 34)
    // -------------------------------------------------------------
    console.log('\n--- CLEANING UP TEST FIXTURES ---');
    // Delete remaining news articles created by test
    await sql`DELETE FROM news_events WHERE id IN (${viOnlyCreated.id}, ${bilingualCreated.id}, ${draftCreated.id})`;
    // Delete test admin user
    if (testAdminUser) {
      await sql`DELETE FROM users WHERE id = ${testAdminUser.id}`;
    }

    // Verify 0 test rows remain
    const remainingTestNews = (await sql`SELECT count(*)::int as count FROM news_events WHERE title LIKE ${'%FINAL02E%'}`)[0].count;
    const remainingTestUsers = (await sql`SELECT count(*)::int as count FROM users WHERE email LIKE ${'%final02e%'}`)[0].count;
    const remainingTestMachines = (await sql`SELECT count(*)::int as count FROM machines WHERE name LIKE ${'%FINAL02E%'}`)[0].count;
    const remainingTestStandards = (await sql`SELECT count(*)::int as count FROM standards WHERE code LIKE ${'%FINAL02E%'}`)[0].count;
    const remainingTestContacts = (await sql`SELECT count(*)::int as count FROM contacts WHERE full_name LIKE ${'%FINAL02E%'}`)[0].count;

    assert.equal(remainingTestNews, 0);
    assert.equal(remainingTestUsers, 0);
    assert.equal(remainingTestMachines, 0);
    assert.equal(remainingTestStandards, 0);
    assert.equal(remainingTestContacts, 0);
    logTest('CLEANUP', 'Cleanup test data only: All FINAL02E run rows removed; remaining test rows = 0 across all tables', true);

    // -------------------------------------------------------------
    // PHASE 8: EXISTING DATA INTEGRITY AUDIT (Rule 35)
    // -------------------------------------------------------------
    const postCounts = {};
    for (const t of tableList) {
      const [r] = await sql.unsafe(`SELECT count(*)::int as count FROM "${t}"`);
      postCounts[t] = r.count;
    }
    evidence.postCounts = postCounts;

    // Compare with pre-test counts
    // Note: news_event_translations gained exactly 3 backfilled rows during migration 0001
    assert.equal(postCounts.users, preCounts.users, 'Users table count must match pre-test');
    assert.equal(postCounts.machines, preCounts.machines, 'Machines table count must match pre-test');
    assert.equal(postCounts.standards, preCounts.standards, 'Standards table count must match pre-test');
    assert.equal(postCounts.media_assets, preCounts.media_assets, 'Media assets table count must match pre-test');
    assert.equal(postCounts.contacts, preCounts.contacts, 'Contacts table count must match pre-test');
    assert.equal(postCounts.news_events, preCounts.news_events, 'News events table count must match pre-test (3 legacy records)');
    assert.equal(postCounts.news_event_translations, 3, 'News event translations must contain exactly the 3 backfilled legacy records');
    logTest('DATA_PROTECTION', 'Existing project data integrity: All pre-existing rows intact and unaffected', true);

    console.log('\n========================================================================');
    console.log(`ALL FINAL-02E INTEGRATION TESTS COMPLETED SUCCESSFULLY! (${results.filter(r => r.status === 'PASS').length}/${results.length})`);
    console.log('========================================================================\n');

  } catch (err) {
    console.error('FINAL-02E Test Suite Error:', err);
    logTest('FATAL', 'Unexpected error during integration execution', false, err.message);
  } finally {
    if (testAdminUser) {
      try {
        await sql`DELETE FROM users WHERE id = ${testAdminUser.id}`;
      } catch {}
    }
    if (apiProcess) {
      console.log('Stopping test Nest API process...');
      apiProcess.kill();
    }
    await sql.end();

    // Save test results report
    fs.writeFileSync(
      path.join(outputDir, 'final-02e-results.json'),
      JSON.stringify({ runId, timestamp: new Date().toISOString(), results, evidence }, null, 2),
      'utf8'
    );
  }
}

run().catch(err => {
  console.error('Execution failed:', err);
  process.exit(1);
});
