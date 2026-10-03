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

console.log('=== PR-10A: REAL POSTGRESQL INTEGRATION TEST ===');
console.log(`Host: ${parsedUrl.hostname}`);
console.log(`Port: ${parsedUrl.port || '5432'}`);
console.log(`Database: ${parsedUrl.pathname.replace('/', '')}`);
console.log(`User: ${parsedUrl.username}`);
console.log('Password: *** (REDACTED)');

const sql = postgres(databaseUrl, {
  max: 5,
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

    // Clean up any stale pr10a fixtures
    await sql`DELETE FROM users WHERE email LIKE 'pr10a-%@example.invalid'`;

    // Existing users preflight check
    const existingBefore = await sql`
      SELECT id, email, full_name, role, status, password_hash, failed_login_attempts, locked_until
      FROM users
      WHERE email NOT LIKE 'pr10a-%@example.invalid'
      ORDER BY email;
    `;
    console.log(`[PASS] Existing users count before test: ${existingBefore.length}`);
    for (const u of existingBefore) {
      console.log(` - User: ${u.email} (${u.role}, status: ${u.status})`);
    }

    // Dynamic import dist modules
    const { AuthService } = await import('../../../api/dist/modules/auth/auth.service.js');
    const { drizzle } = await import('../../../api/node_modules/drizzle-orm/postgres-js/index.js');
    const schema = await import('../../../api/dist/database/schema.js');

    const drizzleDb = drizzle(sql, { schema });
    const mockJwtService = {
      signAsync: async (payload) => `jwt_token_${payload.sub}`,
      decode: () => ({ exp: Math.floor(Date.now() / 1000) + 3600 }),
      verifyAsync: async () => ({ sub: 'dummy', exp: Math.floor(Date.now() / 1000) + 3600 }),
    };

    const authService = new AuthService(drizzleDb, mockJwtService);

    // Create dedicated fixture with known Password A
    const fixtureEmail = `pr10a-${Date.now()}@example.invalid`;
    const passwordA = 'InitialSecret#2026A';
    const passwordB = 'NewStrongSecret#2026B';
    const hashA = await hash(passwordA, 10);

    const [fixtureUser] = await sql`
      INSERT INTO users (
        email, password_hash, full_name, role, status, failed_login_attempts, locked_until
      ) VALUES (
        ${fixtureEmail}, ${hashA}, 'PR10A Test Admin', 'admin', 'active', 0, NULL
      ) RETURNING id, email, role, status;
    `;
    console.log(`\n[PASS] Created test fixture: ${fixtureUser.email} (ID: ${fixtureUser.id})`);

    // -------------------------------------------------------------
    // Step 1: Login with Password A -> success
    // -------------------------------------------------------------
    console.log('\n[Step 1] Login with initial password A...');
    const loginResA = await authService.login({ email: fixtureEmail, password: passwordA });
    console.log(`[PASS] Login A succeeded. AccessToken issued: ${loginResA.accessToken.substring(0, 15)}...`);

    // -------------------------------------------------------------
    // Step 2: Change password with WRONG current password -> reject
    // -------------------------------------------------------------
    console.log('\n[Step 2] Change password with WRONG current password...');
    let wrongCurrentThrew = false;
    let wrongCurrentMsg = '';
    try {
      await authService.changePassword(fixtureUser.id, {
        currentPassword: 'WrongPassword#999',
        newPassword: passwordB,
      });
    } catch (err) {
      wrongCurrentThrew = true;
      wrongCurrentMsg = err.message || '';
    }
    if (!wrongCurrentThrew) throw new Error('Expected wrong current password to throw error');
    console.log(`[PASS] Change rejected: "${wrongCurrentMsg}"`);

    // Verify DB password_hash is UNCHANGED
    const [rowAfterStep2] = await sql`SELECT password_hash FROM users WHERE id = ${fixtureUser.id}`;
    if (rowAfterStep2.password_hash !== hashA) {
      throw new Error('password_hash was mutated on failed current password attempt!');
    }
    console.log('[PASS] DB password_hash verified UNCHANGED after rejected attempt');

    // -------------------------------------------------------------
    // Step 3: Change Password A -> strong Password B -> success
    // -------------------------------------------------------------
    console.log('\n[Step 3] Change Password A -> strong Password B...');
    const changeRes = await authService.changePassword(fixtureUser.id, {
      currentPassword: passwordA,
      newPassword: passwordB,
    });
    console.log(`[PASS] Change password result: "${changeRes.message}"`);

    // Verify response does not leak passwordHash or passwords
    const resKeys = Object.keys(changeRes);
    if (resKeys.includes('password') || resKeys.includes('passwordHash') || resKeys.includes('newPassword')) {
      throw new Error('Response exposed sensitive fields!');
    }
    console.log('[PASS] Verified response does not leak password/hash');

    // Verify DB password_hash changed, starts with bcrypt prefix, != plaintext B
    const [rowAfterStep3] = await sql`SELECT password_hash, failed_login_attempts, locked_until FROM users WHERE id = ${fixtureUser.id}`;
    if (rowAfterStep3.password_hash === hashA) {
      throw new Error('password_hash was NOT changed after successful update!');
    }
    if (rowAfterStep3.password_hash === passwordB) {
      throw new Error('password_hash was stored in PLAINTEXT!');
    }
    if (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(rowAfterStep3.password_hash)) {
      throw new Error('password_hash is not a valid bcrypt hash!');
    }
    console.log('[PASS] DB password_hash updated to new valid bcrypt hash (not plaintext)');
    console.log(`[PASS] Lockout reset verified: failed_login_attempts=${rowAfterStep3.failed_login_attempts}, locked_until=${rowAfterStep3.locked_until}`);

    // -------------------------------------------------------------
    // Step 4: Login with old Password A -> FAIL
    // -------------------------------------------------------------
    console.log('\n[Step 4] Login with old Password A...');
    let oldPassFailed = false;
    try {
      await authService.login({ email: fixtureEmail, password: passwordA });
    } catch {
      oldPassFailed = true;
    }
    if (!oldPassFailed) throw new Error('Old password A succeeded login after change!');
    console.log('[PASS] Login with old Password A correctly REJECTED (401)');

    // -------------------------------------------------------------
    // Step 5: Login with new Password B -> SUCCESS
    // -------------------------------------------------------------
    console.log('\n[Step 5] Login with new Password B...');
    const loginResB = await authService.login({ email: fixtureEmail, password: passwordB });
    console.log(`[PASS] Login with new Password B SUCCEEDED. Token: ${loginResB.accessToken.substring(0, 15)}...`);
    console.log(`[PASS] Authenticated user identity: ${loginResB.user.email} (${loginResB.user.role})`);

    // -------------------------------------------------------------
    // Step 6: Verify login response does not leak passwordHash
    // -------------------------------------------------------------
    console.log('\n[Step 6] Verify login response safety...');
    if (JSON.stringify(loginResB).includes('passwordHash') || JSON.stringify(loginResB).includes('password')) {
      throw new Error('Login response exposed password/hash!');
    }
    console.log('[PASS] Verified login response does not expose passwordHash or password');

    // -------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------
    console.log('\n--- CLEANUP ---');
    await sql`DELETE FROM users WHERE id = ${fixtureUser.id}`;
    const [remaining] = await sql`SELECT count(*) as count FROM users WHERE email LIKE 'pr10a-%@example.invalid'`;
    console.log(`[PASS] Deleted fixture. Remaining pr10a fixtures: ${remaining.count}`);
    if (Number(remaining.count) !== 0) throw new Error('Fixture cleanup incomplete');

    // Existing user integrity check
    const existingAfter = await sql`
      SELECT id, email, full_name, role, status, password_hash, failed_login_attempts, locked_until
      FROM users
      WHERE email NOT LIKE 'pr10a-%@example.invalid'
      ORDER BY email;
    `;
    console.log(`\n[PASS] Existing users count after cleanup: ${existingAfter.length}`);
    if (existingAfter.length !== existingBefore.length) {
      throw new Error(`Existing users count changed from ${existingBefore.length} to ${existingAfter.length}`);
    }
    for (let i = 0; i < existingBefore.length; i++) {
      const b = existingBefore[i];
      const a = existingAfter[i];
      if (b.id !== a.id || b.email !== a.email || b.password_hash !== a.password_hash || b.role !== a.role || b.status !== a.status) {
        throw new Error(`Integrity mismatch for existing user ${b.email}!`);
      }
      console.log(` - Verified intact: ${a.email} (${a.role}, ${a.status})`);
    }

    console.log('\n=== ALL PR-10A REAL POSTGRESQL INTEGRATION CHECKS PASSED ===');
  } catch (err) {
    console.error('ERROR in PR-10A integration test:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
