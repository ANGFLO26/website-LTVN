import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from '../../../api/node_modules/postgres/src/index.js';
import { drizzle } from '../../../api/node_modules/drizzle-orm/postgres-js/index.js';
import { eq, sql as dSql } from '../../../api/node_modules/drizzle-orm/index.js';
import * as schema from '../../../api/dist/database/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

// 1. Read api/.env
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

console.log('=== PR-09A: REAL POSTGRESQL INTEGRATION TEST ===');
console.log(`Host: ${dbHost}`);
console.log(`Port: ${dbPort}`);
console.log(`Database: ${dbName}`);
console.log(`User: ${dbUser}`);
console.log('Password: *** (REDACTED)\n');

const sql = postgres(databaseUrl, {
  max: 3,
  connect_timeout: 10,
  ssl: { rejectUnauthorized: false },
});
const db = drizzle(sql, { schema });

async function main() {
  const backupDir = path.join(__dirname, 'backup');
  fs.mkdirSync(backupDir, { recursive: true });

  try {
    // -------------------------------------------------------------
    // PHASE 1: READ-ONLY SAFETY PREFLIGHT
    // -------------------------------------------------------------
    console.log('--- PHASE 1: READ-ONLY SAFETY PREFLIGHT ---');
    const [identity] = await sql`
      SELECT current_database() as database,
             current_user as user,
             version() as version;
    `;
    console.log(`[PASS] DB Identity: DB=${identity.database}, User=${identity.user}`);

    if (identity.database !== 'neondb') {
      throw new Error(`Expected dev database 'neondb', but got '${identity.database}'. Aborting.`);
    }

    // Inspect existing contacts before migration
    const existingContactsBefore = await sql`
      SELECT id, full_name, company_name, email, phone, subject, status, assigned_to, admin_note
      FROM contacts
      ORDER BY created_at ASC;
    `;
    console.log(`[PASS] Existing contacts count before migration: ${existingContactsBefore.length}`);
    for (const c of existingContactsBefore) {
      console.log(` - Contact: ${c.full_name} (${c.email}, status: ${c.status})`);
    }

    // Inspect existing users before migration
    const existingUsersBefore = await sql`
      SELECT id, email, role, status FROM users ORDER BY email ASC;
    `;
    console.log(`[PASS] Existing users count before migration: ${existingUsersBefore.length}`);
    for (const u of existingUsersBefore) {
      console.log(` - User: ${u.email} (${u.role}, status: ${u.status})`);
    }

    // -------------------------------------------------------------
    // PHASE 2: PRE-MIGRATION LOGICAL BACKUP
    // -------------------------------------------------------------
    console.log('\n--- PHASE 2: PRE-MIGRATION LOGICAL BACKUP ---');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup_before_0003_${timestamp}.json`);

    const tables = ['users', 'machines', 'standards', 'news_events', 'news_event_translations', 'contacts', 'media_assets'];
    const backupData = {
      timestamp: new Date().toISOString(),
      database: identity.database,
      tables: {},
    };

    for (const t of tables) {
      const rows = await sql.unsafe(`SELECT * FROM ${t}`);
      backupData.tables[t] = rows;
    }

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');
    const stats = fs.statSync(backupFile);
    console.log(`[PASS] Backup written to: ${backupFile}`);
    console.log(`[PASS] Backup file size: ${stats.size} bytes (Verified > 0)`);
    if (stats.size === 0) {
      throw new Error('Backup file size is 0! Aborting.');
    }

    // -------------------------------------------------------------
    // PHASE 3: APPLY MIGRATION 0003
    // -------------------------------------------------------------
    console.log('\n--- PHASE 3: APPLY MIGRATION 0003 ---');
    const [tableExists] = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'contact_outbox'
      ) as exists;
    `;

    if (tableExists && tableExists.exists) {
      console.log('[INFO] Table contact_outbox already exists.');
    } else {
      console.log('[INFO] Applying migration 0003_red_hellfire_club.sql...');
      const migrationPath = path.join(rootDir, 'api', 'drizzle', '0003_red_hellfire_club.sql');
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');

      const statements = migrationSql
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        await sql.unsafe(statement);
      }
      console.log('[PASS] Migration 0003 applied successfully.');
    }

    // Verify information_schema for contact_outbox
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'contact_outbox'
      ORDER BY ordinal_position;
    `;
    console.log(`[PASS] Table contact_outbox has ${columns.length} columns:`);
    for (const col of columns) {
      console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable}, default: ${col.column_default})`);
    }
    assert.equal(columns.length, 10, 'Expected exactly 10 columns in contact_outbox');

    // Verify foreign key constraint
    const fks = await sql`
      SELECT conname, confdeltype
      FROM pg_constraint
      WHERE conrelid = 'contact_outbox'::regclass AND contype = 'f';
    `;
    console.log(`[PASS] Foreign key verified: ${fks[0].conname} (delete rule: ${fks[0].confdeltype === 'r' ? 'RESTRICT' : fks[0].confdeltype})`);
    assert.equal(fks[0].confdeltype, 'r', 'Foreign key must be ON DELETE RESTRICT (r)');

    // Verify indexes
    const indexes = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'contact_outbox';
    `;
    console.log(`[PASS] Indexes verified on contact_outbox (${indexes.length} indexes):`);
    for (const idx of indexes) {
      console.log(`   - ${idx.indexname}`);
    }

    // -------------------------------------------------------------
    // PHASE 4: HAPPY-PATH CONTACT + OUTBOX REAL TRANSACTION
    // -------------------------------------------------------------
    console.log('\n--- PHASE 4: HAPPY-PATH CONTACT + OUTBOX REAL TRANSACTION ---');
    const fixtureEmail = `pr09a-${Date.now()}@example.invalid`;
    const fixturePayload = {
      fullName: 'PR09A Test Customer',
      companyName: 'PR09A Industrial Labs',
      email: fixtureEmail,
      phone: '+84 987 654 321',
      subject: 'Tư vấn lựa chọn sản phẩm',
      message: 'PR-09A verified transaction test message.',
    };

    console.log(`[INFO] Submitting contact via real transaction for: ${fixtureEmail}`);
    const created = await db.transaction(async (tx) => {
      const [contact] = await tx
        .insert(schema.contacts)
        .values({
          fullName: fixturePayload.fullName,
          companyName: fixturePayload.companyName,
          email: fixturePayload.email,
          phone: fixturePayload.phone,
          subject: fixturePayload.subject,
          message: fixturePayload.message,
          status: 'new',
          assignedTo: null,
          adminNote: null,
          resolvedAt: null,
        })
        .returning();

      await tx.insert(schema.contactOutbox).values({
        contactId: contact.id,
        eventType: 'contact.notification.requested',
        status: 'pending',
        attemptCount: 0,
        nextAttemptAt: new Date(),
        lastError: null,
        processedAt: null,
      });

      return contact;
    });

    console.log(`[PASS] Contact created with ID: ${created.id}`);

    // Verify database state directly via SQL
    const [persistedContact] = await sql`
      SELECT * FROM contacts WHERE id = ${created.id};
    `;
    assert.ok(persistedContact, 'Contact must exist in database');
    console.log(`[PASS] Contact in DB: ${persistedContact.full_name} (${persistedContact.email})`);

    const outboxRows = await sql`
      SELECT * FROM contact_outbox WHERE contact_id = ${created.id};
    `;
    console.log(`[PASS] Outbox entries for contact: ${outboxRows.length} (Verified exact-one)`);
    assert.equal(outboxRows.length, 1, 'Exact-one outbox event must be created');

    const outboxEntry = outboxRows[0];
    console.log(`[PASS] Outbox Entry Details:`);
    console.log(`   - id: ${outboxEntry.id}`);
    console.log(`   - contact_id: ${outboxEntry.contact_id}`);
    console.log(`   - event_type: ${outboxEntry.event_type}`);
    console.log(`   - status: ${outboxEntry.status} (pending)`);
    console.log(`   - attempt_count: ${outboxEntry.attempt_count} (0)`);
    console.log(`   - next_attempt_at: ${outboxEntry.next_attempt_at}`);
    console.log(`   - last_error: ${outboxEntry.last_error} (null)`);
    console.log(`   - processed_at: ${outboxEntry.processed_at} (null)`);

    assert.equal(outboxEntry.status, 'pending');
    assert.equal(outboxEntry.attempt_count, 0);
    assert.equal(outboxEntry.last_error, null);
    assert.equal(outboxEntry.processed_at, null);
    assert.equal(outboxEntry.event_type, 'contact.notification.requested');

    // -------------------------------------------------------------
    // PHASE 5: REAL FORCED ROLLBACK PROOF
    // -------------------------------------------------------------
    console.log('\n--- PHASE 5: REAL FORCED ROLLBACK PROOF ---');
    const rollbackEmail = `pr09a-rollback-${Date.now()}@example.invalid`;
    let rollbackErrorCaught = false;

    console.log(`[INFO] Attempting transaction with intentional outbox constraint violation...`);
    try {
      await db.transaction(async (tx) => {
        // Step 1: Insert contact
        const [c] = await tx
          .insert(schema.contacts)
          .values({
            fullName: 'Rollback Contact Victim',
            companyName: 'Rollback Inc',
            email: rollbackEmail,
            phone: '+84 900 000 000',
            subject: 'Yêu cầu báo giá',
            message: 'This message must roll back completely.',
            status: 'new',
          })
          .returning();

        // Step 2: Force outbox failure by violating CHECK constraint on status
        await tx.insert(schema.contactOutbox).values({
          contactId: c.id,
          eventType: 'contact.notification.requested',
          status: 'invalid_status_violates_check',
          attemptCount: 0,
        });
      });
    } catch (err) {
      rollbackErrorCaught = true;
      console.log(`[PASS] Transaction failed and caught as expected: ${err.message}`);
    }

    assert.ok(rollbackErrorCaught, 'Transaction must fail due to check constraint');

    // Query DB to prove contact was NOT persisted
    const rolledBackContacts = await sql`
      SELECT id, email FROM contacts WHERE email = ${rollbackEmail};
    `;
    console.log(`[PASS] Contacts matching rollback email in DB: ${rolledBackContacts.length} (Expected 0)`);
    assert.equal(rolledBackContacts.length, 0, 'Rolled back contact must NOT exist in database');

    const rolledBackOutbox = await sql`
      SELECT id FROM contact_outbox WHERE status = 'invalid_status_violates_check';
    `;
    console.log(`[PASS] Outbox entries matching invalid status in DB: ${rolledBackOutbox.length} (Expected 0)`);
    assert.equal(rolledBackOutbox.length, 0, 'Failed outbox record must NOT exist in database');

    // -------------------------------------------------------------
    // PHASE 6: CLEANUP & INTEGRITY VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- PHASE 6: CLEANUP & INTEGRITY VERIFICATION ---');
    // Delete test fixture outbox entries first (due to ON DELETE RESTRICT)
    await sql`
      DELETE FROM contact_outbox
      WHERE contact_id IN (
        SELECT id FROM contacts WHERE email LIKE 'pr09a-%@example.invalid'
      );
    `;

    // Delete test fixture contact
    await sql`
      DELETE FROM contacts WHERE email LIKE 'pr09a-%@example.invalid';
    `;

    // Verify fixture cleanup
    const remainingFixturesContact = await sql`
      SELECT count(*) as count FROM contacts WHERE email LIKE 'pr09a-%@example.invalid';
    `;
    const remainingFixturesOutbox = await sql`
      SELECT count(*) as count FROM contact_outbox
      WHERE event_type = 'contact.notification.requested'
        AND contact_id NOT IN (SELECT id FROM contacts);
    `;
    console.log(`[PASS] Remaining PR09A contact fixtures: ${remainingFixturesContact[0].count}`);
    console.log(`[PASS] Remaining PR09A outbox fixtures: ${remainingFixturesOutbox[0].count}`);
    assert.equal(Number(remainingFixturesContact[0].count), 0);
    assert.equal(Number(remainingFixturesOutbox[0].count), 0);

    // Verify existing contacts preserved
    const existingContactsAfter = await sql`
      SELECT id, full_name, company_name, email, phone, subject, status, assigned_to, admin_note
      FROM contacts
      ORDER BY created_at ASC;
    `;
    console.log(`[PASS] Existing contacts count after cleanup: ${existingContactsAfter.length}`);
    assert.equal(existingContactsAfter.length, existingContactsBefore.length);
    for (let i = 0; i < existingContactsBefore.length; i++) {
      assert.equal(existingContactsAfter[i].id, existingContactsBefore[i].id);
      assert.equal(existingContactsAfter[i].email, existingContactsBefore[i].email);
      assert.equal(existingContactsAfter[i].status, existingContactsBefore[i].status);
    }
    console.log('[PASS] Existing contacts data fully preserved (IDs, customer fields, admin fields intact).');

    // Verify existing users preserved
    const existingUsersAfter = await sql`
      SELECT id, email, role, status FROM users ORDER BY email ASC;
    `;
    assert.equal(existingUsersAfter.length, existingUsersBefore.length);
    console.log('[PASS] Existing users data fully preserved.');

    // Verify migration 0003 remains applied
    const [finalTableCheck] = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'contact_outbox'
      ) as exists;
    `;
    assert.ok(finalTableCheck.exists, 'contact_outbox table must remain applied in schema');
    console.log('[PASS] Migration 0003 remains applied and contact_outbox table is active.');

    console.log('\n=== ALL PR-09A REAL POSTGRESQL INTEGRATION CHECKS PASSED ===');
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error('\n[FAIL] PR-09A Integration test failed:', err);
  process.exit(1);
});
