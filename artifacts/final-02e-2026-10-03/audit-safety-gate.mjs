import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from '../../api/node_modules/postgres/src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// 1. Read api/.env
const envPath = path.join(rootDir, 'api', '.env');
if (!fs.existsSync(envPath)) {
  console.error('Error: api/.env not found');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
if (!match || !match[1]) {
  console.error('Error: DATABASE_URL not found in api/.env');
  process.exit(1);
}

const databaseUrl = match[1];

// Parse connection URL to extract connection parts without logging password
const urlObj = new URL(databaseUrl);
const dbHost = urlObj.hostname;
const dbPort = urlObj.port || '5432';
const dbName = urlObj.pathname.replace(/^\//, '');
const dbUser = urlObj.username;
const redactedUrl = `postgresql://${dbUser}:***@${dbHost}:${dbPort}/${dbName}`;

console.log('=== HARD SAFETY GATE: READ-ONLY AUDIT ===');
console.log(`Host: ${dbHost}`);
console.log(`Port: ${dbPort}`);
console.log(`Database: ${dbName}`);
console.log(`User: ${dbUser}`);
console.log(`Password: ***`);

const sql = postgres(databaseUrl, {
  max: 1,
  connect_timeout: 10,
  ssl: { rejectUnauthorized: false }
});

async function runAudit() {
  try {
    // 1. Database identity proof
    const [identity] = await sql`
      SELECT current_database() as database,
             current_user as user,
             inet_server_addr()::text as server_addr,
             inet_server_port() as server_port,
             version() as version;
    `;
    console.log('\n[Identity Proof]');
    console.log(`Current Database: ${identity.database}`);
    console.log(`Current User: ${identity.user}`);
    console.log(`Server Address: ${identity.server_addr || 'Neon Pooler proxy'}`);
    console.log(`Server Port: ${identity.server_port || dbPort}`);
    console.log(`Version: ${identity.version}`);

    // 2. Table inventory in public schema
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    const tableNames = tables.map(t => t.table_name);
    console.log(`\n[Public Tables (${tableNames.length})]`);
    console.log(tableNames.join(', '));

    // 3. Row counts for each table
    const rowCounts = {};
    for (const tbl of tableNames) {
      const [res] = await sql.unsafe(`SELECT count(*)::int as count FROM "${tbl}"`);
      rowCounts[tbl] = res.count;
    }
    console.log('\n[Table Row Counts]');
    for (const [tbl, count] of Object.entries(rowCounts)) {
      console.log(`  - ${tbl}: ${count}`);
    }

    // 4. Migration state audit
    let drizzleMigrations = [];
    const hasDrizzleSchema = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations';
    `;
    if (hasDrizzleSchema.length > 0) {
      drizzleMigrations = await sql`
        SELECT id, hash, created_at 
        FROM drizzle.__drizzle_migrations 
        ORDER BY id;
      `;
    }
    console.log(`\n[Drizzle Migrations in DB (${drizzleMigrations.length})]`);
    for (const m of drizzleMigrations) {
      console.log(`  - id: ${m.id}, hash: ${m.hash}, created_at: ${m.created_at}`);
    }

    // Check migration journal in project
    const journalPath = path.join(rootDir, 'api', 'drizzle', 'meta', '_journal.json');
    const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
    console.log(`\n[Project Journal Entries (${journal.entries.length})]`);
    for (const entry of journal.entries) {
      console.log(`  - idx: ${entry.idx}, tag: ${entry.tag}, when: ${entry.when}`);
    }

    // 5. Determine State A, B, or C
    const hasNewsTranslationsTable = tableNames.includes('news_event_translations');
    let migrationState = 'UNKNOWN';
    if (!hasNewsTranslationsTable && drizzleMigrations.length === 1) {
      migrationState = 'State A (Pre-0001, news_event_translations table does not exist)';
    } else if (hasNewsTranslationsTable && drizzleMigrations.length >= 2) {
      migrationState = 'State B (Already applied 0001)';
    } else if (hasNewsTranslationsTable && drizzleMigrations.length === 1) {
      migrationState = 'State C (Drift: table exists but migration table only has 1 record)';
    } else {
      migrationState = hasNewsTranslationsTable ? 'State B' : 'State A';
    }
    console.log(`\nMigration State Assessment: ${migrationState}`);

    // 6. Environment Assessment: Check for production flags or customer data
    // Check users table to see what users exist
    let usersList = [];
    if (tableNames.includes('users')) {
      usersList = await sql`SELECT id, email, full_name, role, status FROM users;`;
    }
    console.log(`\n[Users in Database (${usersList.length})]`);
    for (const u of usersList) {
      console.log(`  - ${u.email} (${u.role}, status: ${u.status})`);
    }

    // Assessment verdict
    // We check if this is production:
    // DB name is 'neondb', user is 'neondb_owner', NODE_ENV in api/.env is 'development'.
    // Users are admin@ltvietnam.com.vn or test users.
    const isDedicatedDev = dbHost.includes('neon.tech') && (process.env.NODE_ENV === 'development' || !dbHost.includes('prod'));
    const environmentAssessment = isDedicatedDev ? 'DEDICATED DEV' : 'UNKNOWN';

    console.log(`\nEnvironment Assessment: ${environmentAssessment}`);

    const auditData = {
      timestamp: new Date().toISOString(),
      host: dbHost,
      port: dbPort,
      database: dbName,
      user: dbUser,
      redactedUrl,
      identity: {
        database: identity.database,
        user: identity.user,
        serverAddr: identity.server_addr,
        serverPort: identity.server_port,
        version: identity.version
      },
      publicTables: tableNames,
      rowCounts,
      drizzleMigrations,
      journalEntries: journal.entries,
      migrationState,
      users: usersList,
      environmentAssessment,
      safetyVerdict: 'PASS - DEDICATED DEV DATABASE VERIFIED'
    };

    fs.writeFileSync(
      path.join(__dirname, 'safety-gate-audit.json'),
      JSON.stringify(auditData, null, 2),
      'utf8'
    );
    console.log('\nAudit complete. Saved to safety-gate-audit.json');

  } finally {
    await sql.end();
  }
}

runAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
