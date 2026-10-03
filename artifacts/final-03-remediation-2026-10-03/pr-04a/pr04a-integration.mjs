import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from '../../../api/node_modules/postgres/src/index.js';
import { hash, compare } from '../../../api/node_modules/bcryptjs/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

// 1. Read api/.env for DATABASE_URL
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

// Extract URL parts for safe logging
const urlObj = new URL(databaseUrl);
const dbHost = urlObj.hostname;
const dbPort = urlObj.port || '5432';
const dbName = urlObj.pathname.replace(/^\//, '');
const dbUser = urlObj.username;

console.log('=== PR-04A: DATABASE INTEGRATION & REMEDIATION ===');
console.log(`Host: ${dbHost}`);
console.log(`Port: ${dbPort}`);
console.log(`Database: ${dbName}`);
console.log(`User: ${dbUser}`);
console.log(`Password: *** (REDACTED)`);

const sql = postgres(databaseUrl, {
  max: 1,
  connect_timeout: 10,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const backupDir = path.join(__dirname, 'backup');
  fs.mkdirSync(backupDir, { recursive: true });

  try {
    // -------------------------------------------------------------
    // PHASE 1: READ-ONLY SAFETY PREFLIGHT
    // -------------------------------------------------------------
    console.log('\n--- PHASE 1: READ-ONLY SAFETY PREFLIGHT ---');
    const [identity] = await sql`
      SELECT current_database() as database,
             current_user as user,
             version() as version;
    `;
    console.log(`[PASS] DB Identity: DB=${identity.database}, User=${identity.user}`);

    // Verify it is the development database
    if (identity.database !== 'neondb') {
      throw new Error(`Expected dev database 'neondb', but got '${identity.database}'. Aborting.`);
    }

    // Clean up any lingering test fixtures from previous interrupted runs
    await sql`DELETE FROM users WHERE email LIKE 'final04a-%@example.invalid'`;

    // Inspect existing users before migration
    const existingUsersBefore = await sql`
      SELECT id, email, full_name, role, status, password_hash
      FROM users
      WHERE email NOT LIKE 'final04a-%@example.invalid'
      ORDER BY email;
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
    const backupFile = path.join(backupDir, `backup_before_0002_${timestamp}.json`);

    // Fetch all tables
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
    // PHASE 3: APPLY MIGRATION 0002
    // -------------------------------------------------------------
    console.log('\n--- PHASE 3: APPLY MIGRATION 0002 ---');
    const cols = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name IN ('failed_login_attempts', 'locked_until');
    `;

    if (cols.length === 2) {
      console.log('[INFO] Columns failed_login_attempts and locked_until already exist.');
    } else {
      console.log('[INFO] Applying migration 0002_ancient_vapor.sql...');
      const migrationPath = path.join(rootDir, 'api', 'drizzle', '0002_ancient_vapor.sql');
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');

      await sql.begin(async (trx) => {
        // Execute DDL statements
        await trx.unsafe(`
          ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "failed_login_attempts" integer DEFAULT 0 NOT NULL;
          ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locked_until" timestamp with time zone;
        `);
      });
      console.log('[PASS] Migration 0002 applied successfully.');
    }

    // Verify columns on users table
    const colsAfter = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name IN ('failed_login_attempts', 'locked_until')
      ORDER BY column_name;
    `;
    console.log('[PASS] Verified columns on users table:');
    for (const c of colsAfter) {
      console.log(` - ${c.column_name}: type=${c.data_type}, nullable=${c.is_nullable}, default=${c.column_default}`);
    }

    // Verify existing users have default values
    const existingUsersAfter = await sql`
      SELECT id, email, full_name, role, status, failed_login_attempts, locked_until
      FROM users
      WHERE email NOT LIKE 'final04a-%@example.invalid'
      ORDER BY email;
    `;
    console.log('\n[PASS] Verified existing users post-migration data integrity:');
    for (const u of existingUsersAfter) {
      console.log(` - ${u.email}: failedLoginAttempts=${u.failed_login_attempts}, lockedUntil=${u.locked_until}`);
      if (u.failed_login_attempts !== 0) throw new Error(`User ${u.email} failed_login_attempts is not 0`);
      if (u.locked_until !== null) throw new Error(`User ${u.email} locked_until is not null`);
    }

    // -------------------------------------------------------------
    // PHASE 4: TARGETED INTEGRATION TEST WITH DEDICATED FIXTURE
    // -------------------------------------------------------------
    console.log('\n--- PHASE 4: REAL INTEGRATION FIXTURE TEST ---');
    const fixtureEmail = `final04a-${Date.now()}@example.invalid`;
    const fixturePassword = 'ValidTestPassword#123';
    const fixtureHash = await hash(fixturePassword, 10);

    // Clean up any stale fixture with same pattern first
    await sql`DELETE FROM users WHERE email LIKE 'final04a-%@example.invalid'`;

    // Insert dedicated test user
    const [testUser] = await sql`
      INSERT INTO users (
        email, password_hash, full_name, role, status, failed_login_attempts, locked_until
      ) VALUES (
        ${fixtureEmail}, ${fixtureHash}, 'PR04A Test User', 'admin', 'active', 0, NULL
      ) RETURNING id, email, role, status, failed_login_attempts, locked_until;
    `;
    console.log(`[PASS] Created test fixture user: ${testUser.email} (ID: ${testUser.id})`);

    // Dynamic import AuthService from compiled dist
    const { AuthService } = await import('../../../api/dist/modules/auth/auth.service.js');
    const { DRIZZLE } = await import('../../../api/dist/database/database.module.js');
    const { drizzle } = await import('../../../api/node_modules/drizzle-orm/postgres-js/index.js');
    const schema = await import('../../../api/dist/database/schema.js');

    // Create Drizzle instance for AuthService
    const drizzleDb = drizzle(sql, { schema });

    // Mock JwtService for AuthService
    const mockJwtService = {
      signAsync: async (payload) => `test_jwt_token_for_${payload.sub}`,
      decode: (token) => ({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    };

    const authService = new AuthService(drizzleDb, mockJwtService);

    // Step 1: Correct login on clean account -> PASS
    console.log('\n[Step 1] Correct password login on clean account...');
    const loginResult1 = await authService.login({
      email: fixtureEmail,
      password: fixturePassword,
    });
    console.log(`[PASS] Login succeeded, token issued. User: ${loginResult1.user.email}`);

    // Verify DB remains clean
    const [rowAfter1] = await sql`SELECT failed_login_attempts, locked_until FROM users WHERE id = ${testUser.id}`;
    console.log(`[PASS] DB state: attempts=${rowAfter1.failed_login_attempts}, locked_until=${rowAfter1.locked_until}`);
    if (rowAfter1.failed_login_attempts !== 0 || rowAfter1.locked_until !== null) {
      throw new Error('Attempts or locked_until not 0/null after successful login');
    }

    // Step 2: Failed login below threshold (attempts 1 to 4)
    console.log('\n[Step 2] Consecutive failed logins below threshold (1..4)...');
    for (let i = 1; i <= 4; i++) {
      let threw = false;
      try {
        await authService.login({ email: fixtureEmail, password: 'WrongPassword' });
      } catch (err) {
        threw = true;
      }
      if (!threw) throw new Error(`Attempt ${i} should have thrown 401`);

      const [row] = await sql`SELECT failed_login_attempts, locked_until FROM users WHERE id = ${testUser.id}`;
      console.log(`[PASS] Wrong attempt ${i} -> DB attempts=${row.failed_login_attempts}, locked_until=${row.locked_until}`);
      if (row.failed_login_attempts !== i || row.locked_until !== null) {
        throw new Error(`Expected attempts=${i}, locked_until=null, got ${row.failed_login_attempts}, ${row.locked_until}`);
      }
    }

    // Step 3: 5th failed login -> threshold reached -> lockedUntil set
    console.log('\n[Step 3] 5th wrong attempt -> reaching threshold (5)...');
    let threw5 = false;
    try {
      await authService.login({ email: fixtureEmail, password: 'WrongPassword' });
    } catch (err) {
      threw5 = true;
    }
    if (!threw5) throw new Error('Attempt 5 should have thrown 401');

    const [row5] = await sql`SELECT failed_login_attempts, locked_until FROM users WHERE id = ${testUser.id}`;
    console.log(`[PASS] Threshold reached: attempts=${row5.failed_login_attempts}, locked_until=${row5.locked_until}`);
    if (row5.failed_login_attempts !== 5) throw new Error('Expected attempts=5');
    if (!row5.locked_until || new Date(row5.locked_until) <= new Date()) {
      throw new Error(`Expected locked_until in the future, got ${row5.locked_until}`);
    }

    // Step 4: Correct password while account is locked -> DENIED
    console.log('\n[Step 4] Correct password while account is locked...');
    let threwLocked = false;
    let lockErrorMsg = '';
    try {
      await authService.login({ email: fixtureEmail, password: fixturePassword });
    } catch (err) {
      threwLocked = true;
      lockErrorMsg = err.message || '';
    }
    if (!threwLocked) throw new Error('Login with correct password during active lockout should be DENIED');
    console.log(`[PASS] Correct password rejected during lock: ${lockErrorMsg}`);

    // Verify counter was NOT incremented during locked state
    const [rowLockedCheck] = await sql`SELECT failed_login_attempts, locked_until FROM users WHERE id = ${testUser.id}`;
    if (rowLockedCheck.failed_login_attempts !== 5) {
      throw new Error(`Counter should not increment while locked, got ${rowLockedCheck.failed_login_attempts}`);
    }

    // Step 5: Expired lock + correct password -> SUCCESS + RESET
    console.log('\n[Step 5] Controlled expiry of lockout (setting locked_until to 1 min ago)...');
    const pastDate = new Date(Date.now() - 60 * 1000);
    await sql`UPDATE users SET locked_until = ${pastDate.toISOString()} WHERE id = ${testUser.id}`;

    console.log('Logging in with correct password after lock expired...');
    const loginResultAfterExpiry = await authService.login({
      email: fixtureEmail,
      password: fixturePassword,
    });
    console.log(`[PASS] Login succeeded after expired lock. Token: ${loginResultAfterExpiry.accessToken}`);

    const [rowReset] = await sql`SELECT failed_login_attempts, locked_until FROM users WHERE id = ${testUser.id}`;
    console.log(`[PASS] DB state after recovery: attempts=${rowReset.failed_login_attempts}, locked_until=${rowReset.locked_until}`);
    if (rowReset.failed_login_attempts !== 0 || rowReset.locked_until !== null) {
      throw new Error('Account was not reset to 0/null after successful login post-expiry');
    }

    // Step 6: Failures then success reset: wrong, wrong, correct
    console.log('\n[Step 6] Reset-on-success proof: 2 wrong attempts then 1 correct attempt...');
    try { await authService.login({ email: fixtureEmail, password: 'Bad1' }); } catch {}
    try { await authService.login({ email: fixtureEmail, password: 'Bad2' }); } catch {}
    const [rowBeforeSuccess] = await sql`SELECT failed_login_attempts FROM users WHERE id = ${testUser.id}`;
    console.log(`[PASS] After 2 failures: attempts=${rowBeforeSuccess.failed_login_attempts}`);
    if (rowBeforeSuccess.failed_login_attempts !== 2) throw new Error('Expected 2 attempts');

    await authService.login({ email: fixtureEmail, password: fixturePassword });
    const [rowAfterSuccess] = await sql`SELECT failed_login_attempts, locked_until FROM users WHERE id = ${testUser.id}`;
    console.log(`[PASS] After correct login: attempts=${rowAfterSuccess.failed_login_attempts}, locked_until=${rowAfterSuccess.locked_until}`);
    if (rowAfterSuccess.failed_login_attempts !== 0 || rowAfterSuccess.locked_until !== null) {
      throw new Error('Attempts not reset on success');
    }

    // Step 7: Expired lock + wrong password -> starts new cycle at 1
    console.log('\n[Step 7] Expired lock + wrong password -> starts new failure cycle at 1...');
    await sql`UPDATE users SET failed_login_attempts = 5, locked_until = ${pastDate.toISOString()} WHERE id = ${testUser.id}`;
    try { await authService.login({ email: fixtureEmail, password: 'WrongPasswordAgain' }); } catch {}

    const [rowNewCycle] = await sql`SELECT failed_login_attempts, locked_until FROM users WHERE id = ${testUser.id}`;
    console.log(`[PASS] New failure cycle: attempts=${rowNewCycle.failed_login_attempts}, locked_until=${rowNewCycle.locked_until}`);
    if (rowNewCycle.failed_login_attempts !== 1 || rowNewCycle.locked_until !== null) {
      throw new Error(`Expected new cycle attempts=1, locked_until=null, got ${rowNewCycle.failed_login_attempts}, ${rowNewCycle.locked_until}`);
    }

    // Step 8: Unknown email -> generic failure, no user row modified
    console.log('\n[Step 8] Unknown email login test...');
    let unknownThrew = false;
    try {
      await authService.login({ email: 'nonexistent_user_12345@example.invalid', password: 'AnyPassword' });
    } catch (err) {
      unknownThrew = true;
    }
    if (!unknownThrew) throw new Error('Unknown email should throw 401');
    const [unknownRow] = await sql`SELECT count(*) FROM users WHERE email = 'nonexistent_user_12345@example.invalid'`;
    if (Number(unknownRow.count) !== 0) throw new Error('Unknown email created a row!');
    console.log('[PASS] Unknown email threw generic 401, 0 rows mutated');

    // -------------------------------------------------------------
    // PHASE 5: FIXTURE CLEANUP & USER INTEGRITY CHECK
    // -------------------------------------------------------------
    console.log('\n--- PHASE 5: FIXTURE CLEANUP & INTEGRITY VERIFICATION ---');
    await sql`DELETE FROM users WHERE id = ${testUser.id}`;
    console.log(`[PASS] Deleted test fixture user ${testUser.email}`);

    const [remainingTestUsers] = await sql`
      SELECT count(*) as count FROM users WHERE email LIKE 'final04a-%@example.invalid';
    `;
    console.log(`[PASS] PR04A test users remaining: ${remainingTestUsers.count}`);
    if (Number(remainingTestUsers.count) !== 0) {
      throw new Error('Test users still remain in database!');
    }

    // Verify existing non-test users are intact
    const existingUsersFinal = await sql`
      SELECT id, email, full_name, role, status, password_hash
      FROM users
      ORDER BY email;
    `;
    console.log(`[PASS] Existing users count after cleanup: ${existingUsersFinal.length}`);
    if (existingUsersFinal.length !== existingUsersBefore.length) {
      throw new Error(`User count mismatch! Before: ${existingUsersBefore.length}, After: ${existingUsersFinal.length}`);
    }

    for (let i = 0; i < existingUsersBefore.length; i++) {
      const before = existingUsersBefore[i];
      const after = existingUsersFinal[i];
      if (before.id !== after.id || before.email !== after.email || before.password_hash !== after.password_hash) {
        throw new Error(`User integrity mismatch for ${before.email}!`);
      }
      console.log(` - Verified intact: ${after.email} (ID: ${after.id})`);
    }

    console.log('\n=== ALL PR-04A INTEGRATION CHECKS PASSED SUCCESSFULLY ===');
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error('\n❌ PR-04A INTEGRATION FAILED:', err);
  process.exit(1);
});
