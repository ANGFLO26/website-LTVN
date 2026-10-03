# PR-04A Evidence: Admin Login Account Lockout

- **Date**: 2026-10-03
- **Scope**: PR-04A (Account-level failed-login lockout)
- **Target Database**: Existing Development Neon PostgreSQL (`neondb`)
- **Status**: VERIFIED & PASSED

---

## 1. Schema Change & Migration

- **Schema**: `api/src/database/schema.ts`
  - `failedLoginAttempts`: `integer('failed_login_attempts').default(0).notNull()`
  - `lockedUntil`: `timestamp('locked_until', { withTimezone: true })` (nullable)
- **Migration File**: `api/drizzle/0002_ancient_vapor.sql`
  ```sql
  ALTER TABLE "users" ADD COLUMN "failed_login_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
  ALTER TABLE "users" ADD COLUMN "locked_until" timestamp with time zone;
  ```
- **Journal**: `api/drizzle/meta/_journal.json` updated with idx 2 (`0002_ancient_vapor`).
- **Snapshot**: `api/drizzle/meta/0002_snapshot.json` generated via Drizzle kit.

---

## 2. Configuration

- **Config File**: `api/src/modules/auth/auth.config.ts`
  - Function: `getLockoutPolicy(configService?)`
  - Environment variables:
    - `AUTH_MAX_FAILED_ATTEMPTS` (implementation default: `5`, must be integer > 0)
    - `AUTH_LOCKOUT_MINUTES` (implementation default: `15`, must be integer > 0)
  - Fails closed if given negative numbers, 0, or NaN strings.
- **Example Env**: `api/.env.example` documented with both variables.

---

## 3. Login State Machine

1. **Active Lock Check**: If `lockedUntil !== null && lockedUntil > now`:
   - Throws `UnauthorizedException('Account is temporarily locked due to failed login attempts.')`.
   - Counter is not incremented; lock is not reset; password is not checked; no JWT issued.
2. **Password Verification**:
   - Password checked via `bcrypt.compare`.
3. **Wrong Password**:
   - Check if prior lock expired: if `lockedUntil !== null && lockedUntil <= now`, new cycle starts with `attempts = 1`.
   - Otherwise, `attempts = (user.failedLoginAttempts ?? 0) + 1`.
   - If `attempts >= maxFailedAttempts`: `lockedUntil = now + lockoutDurationMs`.
   - Else: `lockedUntil = null`.
   - Throws generic `UnauthorizedException`.
4. **Correct Password**:
   - Resets `failedLoginAttempts = 0`, `lockedUntil = null`, updates `lastLoginAt = now`.
   - Issues JWT token (`Bearer`).
5. **Unknown Email**:
   - Does not match active admin; throws generic `UnauthorizedException`.
   - No DB row mutated; no timing leak.

---

## 4. Real PostgreSQL Verification Matrix

Executed via `artifacts/final-03-remediation-2026-10-03/pr-04a/pr04a-integration.mjs` on `neondb` (host: `ep-blue-flower-azxg0yzk-pooler.c-3.ap-southeast-1.aws.neon.tech`):

| Step | Action | Credentials | HTTP/API Result | DB `failed_login_attempts` | DB `locked_until` | Verification Status |
|---|---|---|---|---|---|---|
| Preflight | Read-only identity check | - | N/A | Existing users = 0 | Existing users = NULL | PASS |
| Backup | Logical JSON snapshot | - | N/A | 7 tables backed up | File size: 49,862 bytes | PASS |
| Migration | Apply 0002 | - | DDL success | Defaults applied | Nullable verified | PASS |
| Step 1 | Initial login | Correct | 200 OK + JWT | 0 | NULL | PASS |
| Step 2.1 | Failed login #1 | Wrong | 401 Unauthorized | 1 | NULL | PASS |
| Step 2.2 | Failed login #2 | Wrong | 401 Unauthorized | 2 | NULL | PASS |
| Step 2.3 | Failed login #3 | Wrong | 401 Unauthorized | 3 | NULL | PASS |
| Step 2.4 | Failed login #4 | Wrong | 401 Unauthorized | 4 | NULL | PASS |
| Step 3 | Failed login #5 (threshold) | Wrong | 401 Unauthorized | 5 | Future timestamp (+15m) | PASS |
| Step 4 | Login while locked | Correct | 401 Locked | 5 (unchanged) | Future timestamp (unchanged) | PASS |
| Step 5 | Login after expired lock | Correct | 200 OK + JWT | 0 (reset) | NULL (reset) | PASS |
| Step 6 | Failures then success | Wrong x2, Correct x1 | 200 OK + JWT | 0 (reset) | NULL (reset) | PASS |
| Step 7 | Expired lock + wrong pw | Wrong | 401 Unauthorized | 1 (new cycle) | NULL | PASS |
| Step 8 | Unknown email login | Invalid email | 401 Unauthorized | Unchanged | Unchanged (0 rows mutated) | PASS |
| Cleanup | DELETE test user | - | N/A | Remaining test users = 0 | Existing users intact (2/2) | PASS |

---

## 5. API Response Safety

- `passwordHash` is never exposed in login responses or users CRUD endpoints.
- `failedLoginAttempts` and `lockedUntil` are kept internal and not included in API response objects or user projections.

---

## 6. Regression Results

- `npm run build:api`: PASS (clean build)
- `npm --prefix api run lint`: PASS (0 errors, 7 baseline warnings in test files)
- `npm --prefix api run test:e2e`: PASS (457/457 tests passing)
- `npm --prefix api test`: PASS (37/37 unit tests passing, including 11 AuthService lockout cases and config policy validation)
- `node scripts/qa01-auth-browser.mjs`: PASS (8/8 browser auth tests passing)
- `node scripts/pr01-database-failfast-test.mjs`: PASS (8/8 fail-fast tests passing)
- `node scripts/pr06-seed-production-guard-test.mjs`: PASS (9/9 seed guard tests passing)
- `git diff --check`: PASS (clean, exit code 0)

---

## 7. Concurrency & Lost-Update Verification (PR-04A-V)

- **Initial Audit**:
  - Found Pattern A (read-modify-write): `findFirst` followed by JS math and `set({ failedLoginAttempts: newAttempts })`.
  - Baseline concurrent test (`5 simultaneous wrong logins` across 10 rounds): 0/10 passed (lost-update reproduced, counter only reached 1 or 2).
- **Remediation**:
  - Implemented atomic SQL update in PostgreSQL via Drizzle `sql`:
    ```sql
    UPDATE users
    SET
      failed_login_attempts = CASE
        WHEN locked_until IS NOT NULL AND locked_until > ${nowIso}::timestamptz THEN failed_login_attempts
        WHEN locked_until IS NOT NULL AND locked_until <= ${nowIso}::timestamptz THEN 1
        ELSE failed_login_attempts + 1
      END,
      locked_until = CASE
        WHEN locked_until IS NOT NULL AND locked_until > ${nowIso}::timestamptz THEN locked_until
        WHEN (CASE WHEN locked_until IS NOT NULL AND locked_until <= ${nowIso}::timestamptz THEN 1 ELSE failed_login_attempts + 1 END) >= ${policy.maxFailedAttempts}
          THEN ${lockUntilIso}::timestamptz
        ELSE NULL
      END,
      updated_at = ${nowIso}::timestamptz
    WHERE id = ${user.id}
    ```
- **Post-Fix Concurrent Verification** (`pr04av-concurrency-test.mjs` on `neondb`):
  - Below-threshold 5-request test: 5 requests completed, DB attempts = 5 (exact match, 0 lost updates).
  - 10-round repeat test: 10/10 rounds PASS (all 10 rounds achieved exact `failed_login_attempts = 5`).
  - Threshold concurrency test (threshold=5): 5 simultaneous requests -> `attempts = 5`, `locked_until = future timestamptz`.
  - Correct password while locked: rejected with 401 (`Account is temporarily locked due to failed login attempts.`).
  - Cleanup: test fixture `pr04av-*` completely deleted (0 remaining), existing users intact (2/2).

