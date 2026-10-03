import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from '../../../api/node_modules/postgres/src/index.js';
import { hash } from '../../../api/node_modules/bcryptjs/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read api/.env
const apiEnvPath = path.resolve(__dirname, '../../../api/.env');
if (!fs.existsSync(apiEnvPath)) {
  console.error('[FAIL] api/.env not found');
  process.exit(1);
}

const envContent = fs.readFileSync(apiEnvPath, 'utf8');
const dbUrlMatch = envContent.match(/^DATABASE_URL=(.+)$/m);
if (!dbUrlMatch) {
  console.error('[FAIL] DATABASE_URL not found in api/.env');
  process.exit(1);
}

const databaseUrl = dbUrlMatch[1].trim();
const parsedUrl = new URL(databaseUrl);

console.log('=== PR-04A-V: CONCURRENT LOCKOUT VERIFICATION ===');
console.log(`Host: ${parsedUrl.hostname}`);
console.log(`Port: ${parsedUrl.port || '5432'}`);
console.log(`Database: ${parsedUrl.pathname.replace('/', '')}`);
console.log(`User: ${parsedUrl.username}`);
console.log('Password: *** (REDACTED)');

const sql = postgres(databaseUrl, {
  max: 15,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: 'require',
});

async function main() {
  try {
    // Phase 1: Preflight
    const [identity] = await sql`SELECT current_database() as database, current_user as user`;
    console.log(`\n[PASS] DB Identity: DB=${identity.database}, User=${identity.user}`);
    if (identity.database !== 'neondb') {
      throw new Error(`Expected dev database 'neondb', but got '${identity.database}'. Aborting.`);
    }

    // Clean up any stale pr04av fixtures
    await sql`DELETE FROM users WHERE email LIKE 'pr04av-%@example.invalid'`;

    // Dynamic import dist modules
    const { AuthService } = await import('../../../api/dist/modules/auth/auth.service.js');
    const { drizzle } = await import('../../../api/node_modules/drizzle-orm/postgres-js/index.js');
    const schema = await import('../../../api/dist/database/schema.js');

    const drizzleDb = drizzle(sql, { schema });
    const mockJwtService = {
      signAsync: async (payload) => `jwt_token_${payload.sub}`,
      decode: () => ({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    };

    const fixtureEmail = `pr04av-${Date.now()}@example.invalid`;
    const fixturePassword = 'ValidPassword#123';
    const fixtureHash = await hash(fixturePassword, 10);

    const [testUser] = await sql`
      INSERT INTO users (
        email, password_hash, full_name, role, status, failed_login_attempts, locked_until
      ) VALUES (
        ${fixtureEmail}, ${fixtureHash}, 'PR04AV Concurrency Fixture', 'admin', 'active', 0, NULL
      ) RETURNING id, email, role, status;
    `;
    console.log(`[PASS] Created test fixture: ${testUser.email} (ID: ${testUser.id})`);

    // -------------------------------------------------------------
    // TEST 1: Below-threshold concurrency (AUTH_MAX_FAILED_ATTEMPTS=20)
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: BELOW-THRESHOLD CONCURRENCY (5 simultaneous wrong logins, threshold=20) ---');
    process.env.AUTH_MAX_FAILED_ATTEMPTS = '20';
    process.env.AUTH_LOCKOUT_MINUTES = '15';
    const authService = new AuthService(drizzleDb, mockJwtService);

    // Reset fixture
    await sql`UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ${testUser.id}`;

    // Fire 5 simultaneous wrong logins
    console.log('Sending 5 simultaneous wrong logins via Promise.all...');
    const resultsTest1 = await Promise.allSettled([
      authService.login({ email: fixtureEmail, password: 'WrongPassword#1' }),
      authService.login({ email: fixtureEmail, password: 'WrongPassword#2' }),
      authService.login({ email: fixtureEmail, password: 'WrongPassword#3' }),
      authService.login({ email: fixtureEmail, password: 'WrongPassword#4' }),
      authService.login({ email: fixtureEmail, password: 'WrongPassword#5' }),
    ]);

    const rejectedTest1 = resultsTest1.filter((r) => r.status === 'rejected').length;
    console.log(`Requests completed: ${resultsTest1.length}, rejected: ${rejectedTest1}`);

    const [rowTest1] = await sql`SELECT failed_login_attempts, locked_until FROM users WHERE id = ${testUser.id}`;
    console.log(`DB state after 5 concurrent requests: failed_login_attempts=${rowTest1.failed_login_attempts}, locked_until=${rowTest1.locked_until}`);

    // -------------------------------------------------------------
    // TEST 2: Repeat test (10 rounds of 5 simultaneous wrong logins)
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: 10 ROUNDS OF CONCURRENT WRONG LOGINS (threshold=20) ---');
    let roundsPassed = 0;
    for (let r = 1; r <= 10; r++) {
      await sql`UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ${testUser.id}`;
      await Promise.allSettled([
        authService.login({ email: fixtureEmail, password: `Wrong#${r}-1` }),
        authService.login({ email: fixtureEmail, password: `Wrong#${r}-2` }),
        authService.login({ email: fixtureEmail, password: `Wrong#${r}-3` }),
        authService.login({ email: fixtureEmail, password: `Wrong#${r}-4` }),
        authService.login({ email: fixtureEmail, password: `Wrong#${r}-5` }),
      ]);
      const [rRow] = await sql`SELECT failed_login_attempts FROM users WHERE id = ${testUser.id}`;
      const passed = rRow.failed_login_attempts === 5;
      if (passed) roundsPassed++;
      console.log(` Round ${r}/10: failed_login_attempts = ${rRow.failed_login_attempts} -> ${passed ? 'PASS' : 'LOST UPDATE'}`);
    }
    console.log(`Total rounds passed: ${roundsPassed}/10`);

    // -------------------------------------------------------------
    // TEST 3: Threshold concurrency case (threshold=5)
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: THRESHOLD CONCURRENCY (threshold=5, 5 simultaneous wrong logins) ---');
    process.env.AUTH_MAX_FAILED_ATTEMPTS = '5';
    process.env.AUTH_LOCKOUT_MINUTES = '15';
    await sql`UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ${testUser.id}`;

    await Promise.allSettled([
      authService.login({ email: fixtureEmail, password: 'Wrong#T-1' }),
      authService.login({ email: fixtureEmail, password: 'Wrong#T-2' }),
      authService.login({ email: fixtureEmail, password: 'Wrong#T-3' }),
      authService.login({ email: fixtureEmail, password: 'Wrong#T-4' }),
      authService.login({ email: fixtureEmail, password: 'Wrong#T-5' }),
    ]);

    const [rowThreshold] = await sql`SELECT failed_login_attempts, locked_until FROM users WHERE id = ${testUser.id}`;
    console.log(`DB state after concurrent threshold attempts: failed_login_attempts=${rowThreshold.failed_login_attempts}, locked_until=${rowThreshold.locked_until}`);

    // Verify correct password login while locked
    let lockedLoginRejected = false;
    let lockedMsg = '';
    try {
      await authService.login({ email: fixtureEmail, password: fixturePassword });
    } catch (err) {
      lockedLoginRejected = true;
      lockedMsg = err.message || '';
    }
    console.log(`Login with correct password during lockout: rejected=${lockedLoginRejected}, message="${lockedMsg}"`);

    // -------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------
    console.log('\n--- CLEANUP ---');
    await sql`DELETE FROM users WHERE id = ${testUser.id}`;
    const [remaining] = await sql`SELECT count(*) as count FROM users WHERE email LIKE 'pr04av-%@example.invalid'`;
    console.log(`[PASS] Deleted fixture. Remaining pr04av fixtures: ${remaining.count}`);

    // Verify existing users intact
    const existingUsers = await sql`SELECT email, role, status FROM users WHERE email NOT LIKE 'pr04av-%@example.invalid'`;
    console.log(`Existing users count: ${existingUsers.length}`);
    for (const u of existingUsers) {
      console.log(` - ${u.email} (${u.role}, ${u.status})`);
    }

  } catch (err) {
    console.error('ERROR in concurrency test:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
