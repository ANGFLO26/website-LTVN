#!/usr/bin/env node
/**
 * SAFE INITIAL ADMIN BOOTSTRAP CLI
 * 
 * Secure one-time initial administrator account creation for LT Việt Nam website.
 * Follows strict production safety guidelines:
 * - One-time bootstrap: Refuses if any active admin already exists in the database.
 * - Prevents role escalation: Refuses if target email already belongs to an existing user.
 * - Transaction-safe & concurrency-safe: Uses PostgreSQL transaction-scoped advisory locks.
 * - Masked database credentials: Never logs or echoes connection secrets or passwords.
 * - Reuses core password policy: 12-72 chars, uppercase, lowercase, number, special char.
 * - Compatible with AuthService: Uses bcryptjs with salt rounds 10.
 * - Supports --dry-run for non-destructive preflight verification.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';
import { Writable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import postgres from '../backend/node_modules/postgres/src/index.js';
import bcrypt from '../backend/node_modules/bcryptjs/index.js';

const { hash } = bcrypt;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Deterministic 64-bit bigint lock key for transaction-scoped advisory lock:
// Hashtext('ltvn_bootstrap_admin_lock') or constant BigInt 5499996772718103881n
export const BOOTSTRAP_ADVISORY_LOCK_KEY = 5499996772718103881n;

/**
 * Reusable password strength validation, matching auth.config.ts.
 */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 72;

export function validatePassword(password) {
  if (typeof password !== 'string') {
    return { valid: false, message: 'Mật khẩu phải là chuỗi ký tự.' };
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, message: `Mật khẩu phải có độ dài tối thiểu ${PASSWORD_MIN_LENGTH} ký tự.` };
  }
  if (password.length > PASSWORD_MAX_LENGTH || Buffer.byteLength(password, 'utf8') > 72) {
    return { valid: false, message: 'Mật khẩu không được vượt quá 72 ký tự.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Mật khẩu phải chứa ít nhất một chữ cái in hoa (A-Z).' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Mật khẩu phải chứa ít nhất một chữ cái thường (a-z).' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Mật khẩu phải chứa ít nhất một chữ số (0-9).' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: 'Mật khẩu phải chứa ít nhất một ký tự đặc biệt (!@#$%^&*...).' };
  }
  return { valid: true };
}

/**
 * Email validation following RFC 5322 basic standard.
 */
export function validateEmail(email) {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > 255) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed);
}

/**
 * Mask database credentials for safe logging & display.
 */
export function maskDatabaseUrl(url) {
  if (!url || typeof url !== 'string') return '[NO_DATABASE_URL]';
  try {
    const parsed = new URL(url);
    const user = parsed.username ? '***' : '';
    const pass = parsed.password ? ':***' : '';
    const auth = (user || pass) ? `${user}${pass}@` : '';
    return `${parsed.protocol}//${auth}${parsed.host}${parsed.pathname}`;
  } catch {
    return url.replace(/:[^:@]+@/, ':****@');
  }
}

/**
 * Resolve database URL from process environment or backend/.env.
 */
export function getDatabaseUrl() {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim()) {
    return process.env.DATABASE_URL.trim();
  }
  try {
    const envPath = resolve(__dirname, '../backend/.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
    if (match && match[1]) return match[1].trim();
  } catch {
    // ignore
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL environment variable is required in production.');
  }
  return 'postgresql://postgres:postgres@localhost:5432/ltvn_db';
}

/**
 * Non-echoing hidden password reader via readline and muted stream.
 * In production or non-TTY, fails safely instead of echoing plaintext.
 */
export function promptHidden(promptText) {
  return new Promise((resolvePrompt, rejectPrompt) => {
    if (!process.stdin.isTTY) {
      rejectPrompt(new Error('SECURE_TTY_REQUIRED: Terminal does not support secure hidden password input. Non-interactive input is forbidden in production.'));
      return;
    }

    let muted = false;
    const mutableStdout = new Writable({
      write(chunk, encoding, callback) {
        if (!muted) {
          process.stdout.write(chunk, encoding);
        }
        callback();
      },
    });

    const rl = readline.createInterface({
      input: process.stdin,
      output: mutableStdout,
      terminal: true,
    });

    process.stdout.write(promptText);
    muted = true;

    rl.question('', (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolvePrompt(answer);
    });
  });
}

/**
 * Standard text reader for non-secret fields.
 */
export function promptQuestion(promptText) {
  return new Promise((resolvePrompt) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(promptText, (answer) => {
      rl.close();
      resolvePrompt(answer.trim());
    });
  });
}

/**
 * Verify schema and check bootstrap eligibility without writing to DB.
 */
export async function checkBootstrapEligibility(sql, schemaName = 'public') {
  // 1. Verify schema tables
  const userTable = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = ${schemaName} AND table_name = 'users'
  `;
  if (userTable.length === 0) {
    return {
      eligible: false,
      reason: `SCHEMA_NOT_FOUND: Table "users" does not exist in schema "${schemaName}". Please run official migrations ("npm run db:migrate") first.`,
      adminCount: 0,
      tablesVerified: false,
    };
  }

  // 2. Count active admins
  const adminCountRes = await sql.unsafe(
    `SELECT COUNT(*)::int AS count FROM "${schemaName}"."users" WHERE role = 'admin' AND deleted_at IS NULL`
  );
  const adminCount = adminCountRes[0]?.count || 0;

  if (adminCount > 0) {
    return {
      eligible: false,
      reason: `DATABASE_ALREADY_HAS_ADMIN: Database already contains ${adminCount} active administrator account(s). Bootstrap refused.`,
      adminCount,
      tablesVerified: true,
    };
  }

  return {
    eligible: true,
    adminCount: 0,
    tablesVerified: true,
  };
}

/**
 * Core bootstrap execution function.
 * Transactional and concurrency-safe via PostgreSQL advisory locks.
 */
export async function bootstrapAdmin(options) {
  const {
    dbUrl = getDatabaseUrl(),
    email,
    fullName = 'Quản Trị Viên Hệ Thống',
    password,
    confirmPassword,
    dryRun = false,
    confirmationApproved = true,
    schemaName = 'public',
    preCommitDelayMs = 0,
  } = options;

  const maskedDbUrl = maskDatabaseUrl(dbUrl);

  // 1. Validate Email
  if (!email || !validateEmail(email)) {
    throw new Error('INVALID_EMAIL: Email không hợp lệ hoặc vượt quá 255 ký tự.');
  }
  const normalizedEmail = email.trim().toLowerCase();

  // 2. Validate Full Name
  if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0 || fullName.trim().length > 255) {
    throw new Error('INVALID_FULL_NAME: Tên hiển thị người dùng không được để trống và không quá 255 ký tự.');
  }
  const normalizedFullName = fullName.trim();

  // 3. Dry-Run early check (can skip password validation if not provided in dry-run)
  if (dryRun) {
    const client = postgres(dbUrl, { max: 1 });
    try {
      const eligibility = await checkBootstrapEligibility(client, schemaName);
      return {
        success: eligibility.eligible,
        dryRun: true,
        databaseWrites: 0,
        eligible: eligibility.eligible,
        reason: eligibility.reason,
        adminCount: eligibility.adminCount,
        tablesVerified: eligibility.tablesVerified,
        maskedDbUrl,
      };
    } finally {
      await client.end();
    }
  }

  // 4. Validate Passwords
  if (password !== confirmPassword) {
    throw new Error('PASSWORD_MISMATCH: Mật khẩu xác nhận không khớp với mật khẩu đã nhập.');
  }
  const strength = validatePassword(password);
  if (!strength.valid) {
    throw new Error(`PASSWORD_POLICY_VIOLATION: ${strength.message}`);
  }

  // 5. Check operator confirmation
  if (!confirmationApproved) {
    throw new Error('OPERATION_CANCELLED: Thao tác tạo Admin đã bị hủy bởi người vận hành.');
  }

  // 6. Connect to database
  const client = postgres(dbUrl, { max: 2 });

  try {
    // 7. Preflight eligibility check
    const eligibility = await checkBootstrapEligibility(client, schemaName);
    if (!eligibility.eligible) {
      throw new Error(eligibility.reason);
    }

    // 8. Hash password using bcryptjs with cost factor 10 (identical to AuthService)
    const passwordHash = await hash(password, 10);

    // 9. Atomic Transaction with Advisory Lock
    const createdAdmin = await client.begin(async (tx) => {
      // Set schema search_path if targeting isolated test schema
      if (schemaName !== 'public') {
        await tx.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);
      }

      // Transaction-scoped advisory lock ensures atomic mutual exclusion across concurrent processes
      await tx`SELECT pg_advisory_xact_lock(${BOOTSTRAP_ADVISORY_LOCK_KEY})`;

      // Re-check inside locked transaction
      const currentAdmins = await tx`
        SELECT id, email 
        FROM users 
        WHERE role = 'admin' AND deleted_at IS NULL 
        LIMIT 1
      `;
      if (currentAdmins.length > 0) {
        throw new Error('DATABASE_ALREADY_HAS_ADMIN: Database already has an active administrator. Initial bootstrap cannot proceed.');
      }

      // Check if target email belongs to any existing user (role promotion forbidden)
      const existingUser = await tx`
        SELECT id, email, role 
        FROM users 
        WHERE lower(email) = ${normalizedEmail} 
        LIMIT 1
      `;
      if (existingUser.length > 0) {
        throw new Error(`EXISTING_USER_DETECTED: Email "${normalizedEmail}" đã thuộc về tài khoản người dùng khác (role: ${existingUser[0].role}). Nâng quyền hoặc ghi đè mật khẩu bị nghiêm cấm.`);
      }

      const newAdminId = randomUUID();
      const inserted = await tx`
        INSERT INTO users (
          id,
          email,
          password_hash,
          full_name,
          role,
          status,
          failed_login_attempts,
          locked_until,
          last_login_at,
          created_at,
          updated_at
        ) VALUES (
          ${newAdminId},
          ${normalizedEmail},
          ${passwordHash},
          ${normalizedFullName},
          'admin',
          'active',
          0,
          NULL,
          NULL,
          NOW(),
          NOW()
        )
        RETURNING id, email, full_name, role, status, created_at
      `;

      // Optional hook for concurrency lock contention testing
      if (preCommitDelayMs > 0) {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, preCommitDelayMs));
      }

      return inserted[0];
    });

    return {
      success: true,
      dryRun: false,
      databaseWrites: 1,
      admin: {
        id: createdAdmin.id,
        email: createdAdmin.email,
        fullName: createdAdmin.full_name,
        role: createdAdmin.role,
        status: createdAdmin.status,
        createdAt: createdAdmin.created_at,
      },
      maskedDbUrl,
    };
  } finally {
    await client.end();
  }
}

/**
 * Determine if current script is being executed directly via CLI
 */
export function isDirectExecution() {
  if (!process.argv[1]) return false;
  try {
    const entryPath = resolve(process.argv[1]).toLowerCase();
    const currentPath = resolve(fileURLToPath(import.meta.url)).toLowerCase();
    return entryPath === currentPath;
  } catch {
    return false;
  }
}

// Interactive CLI Entry Point
if (isDirectExecution()) {
  (async () => {
    try {
      console.log('================================================================');
      console.log('   LT VIỆT NAM — SAFE INITIAL ADMIN BOOTSTRAP');
      console.log('================================================================\n');

      const isDryRun = process.argv.includes('--dry-run');
      const hasHelp = process.argv.includes('--help') || process.argv.includes('-h');

      if (hasHelp) {
        console.log('Cách sử dụng:');
        console.log('  node scripts/bootstrap-admin.mjs            Khởi tạo tài khoản Admin ban đầu (Interactive)');
        console.log('  node scripts/bootstrap-admin.mjs --dry-run  Kiểm tra điều kiện tiên quyết (Không ghi dữ liệu)\n');
        process.exit(0);
      }

      // Production Guard: Deny any CLI arguments attempting to pass credentials
      const forbiddenArgs = process.argv.filter((arg) =>
        arg.startsWith('--password') || arg.startsWith('--pass') || arg.startsWith('--secret')
      );
      if (forbiddenArgs.length > 0) {
        console.error('LỖI BẢO MẬT: Nghiêm cấm truyền mật khẩu qua tham số dòng lệnh CLI.');
        process.exit(1);
      }

      const dbUrl = getDatabaseUrl();
      const maskedUrl = maskDatabaseUrl(dbUrl);
      console.log(`🔗 Database: ${maskedUrl}`);

      // Handle Dry-Run Mode
      if (isDryRun) {
        console.log('\n[CHẾ ĐỘ DRY-RUN] Đang kiểm tra điều kiện tiên quyết...');
        const client = postgres(dbUrl, { max: 1 });
        try {
          const res = await checkBootstrapEligibility(client);
          console.log('\n--- KẾT QUẢ KIỂM TRA DRY-RUN ---');
          console.log(`DATABASE CONNECTION:     VERIFIED`);
          console.log(`SCHEMA COMPATIBILITY:    ${res.tablesVerified ? 'VERIFIED' : 'FAILED'}`);
          console.log(`EXISTING ADMIN CHECK:    ${res.adminCount === 0 ? 'VERIFIED (0 admins)' : `FOUND ${res.adminCount} ADMIN(S)`}`);
          console.log(`ELIGIBLE FOR BOOTSTRAP:  ${res.eligible ? 'YES' : 'NO'}`);
          console.log(`DATABASE WRITES:         0`);
          if (!res.eligible) {
            console.log(`LÝ DO:                   ${res.reason}`);
          }
          console.log('--------------------------------\n');
          process.exit(res.eligible ? 0 : 1);
        } finally {
          await client.end();
        }
      }

      // Interactive Flow
      const client = postgres(dbUrl, { max: 1 });
      let precheck;
      try {
        precheck = await checkBootstrapEligibility(client);
      } finally {
        await client.end();
      }

      if (!precheck.eligible) {
        console.error(`\n❌ TỪ CHỐI BOOTSTRAP: ${precheck.reason}\n`);
        process.exit(1);
      }

      console.log('\nCơ sở dữ liệu đủ điều kiện để tạo tài khoản Quản Trị Viên đầu tiên.\n');

      const email = await promptQuestion('Nhập email Admin: ');
      if (!validateEmail(email)) {
        console.error('❌ Email không hợp lệ.');
        process.exit(1);
      }

      const fullName = (await promptQuestion('Nhập họ và tên [Quản Trị Viên Hệ Thống]: ')) || 'Quản Trị Viên Hệ Thống';

      console.log('\nNhập mật khẩu an toàn (tối thiểu 12 ký tự, gồm chữ hoa, thường, số, ký tự đặc biệt):');
      const password = await promptHidden('Mật khẩu mới: ');
      const strength = validatePassword(password);
      if (!strength.valid) {
        console.error(`❌ Mật khẩu không đạt chuẩn: ${strength.message}`);
        process.exit(1);
      }

      const confirmPassword = await promptHidden('Xác nhận mật khẩu: ');
      if (password !== confirmPassword) {
        console.error('❌ Mật khẩu xác nhận không khớp.');
        process.exit(1);
      }

      console.log('\n----------------------------------------------------------------');
      console.log(`Tài khoản Admin sẽ tạo:  ${email.trim().toLowerCase()}`);
      console.log(`Họ và tên:               ${fullName}`);
      console.log(`Cơ sở dữ liệu đích:      ${maskedUrl}`);
      console.log('----------------------------------------------------------------');

      const confirm = await promptQuestion('Bạn có chắc chắn muốn tiến hành tạo Admin? (yes/no): ');
      if (confirm.toLowerCase() !== 'yes') {
        console.log('\nĐã hủy thao tác. Zero database writes.');
        process.exit(0);
      }

      console.log('\nĐang tạo tài khoản Quản Trị Viên...');
      const result = await bootstrapAdmin({
        dbUrl,
        email,
        fullName,
        password,
        confirmPassword,
        dryRun: false,
        confirmationApproved: true,
      });

      console.log('\n================================================================');
      console.log('   ✅ TẠO TÀI KHOẢN ADMIN BAN ĐẦU THÀNH CÔNG');
      console.log('================================================================');
      console.log(`ID:         ${result.admin.id}`);
      console.log(`Email:      ${result.admin.email}`);
      console.log(`Họ và tên:  ${result.admin.fullName}`);
      console.log(`Role:       ${result.admin.role}`);
      console.log(`Trạng thái: ${result.admin.status}`);
      console.log(`Thời gian:  ${result.admin.createdAt}`);
      console.log('================================================================\n');
      console.log('Lưu ý bảo mật: Hãy bảo quản mật khẩu cẩn thận và thực hiện đăng nhập');
      console.log('ngay tại Cổng Quản Trị để xác nhận quyền truy cập.\n');

      process.exit(0);
    } catch (err) {
      console.error('\n❌ LỖI BOOTSTRAP:', err.message);
      process.exit(1);
    }
  })();
}
