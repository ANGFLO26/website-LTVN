# PR-09A EVIDENCE: TRANSACTIONAL CONTACT OUTBOX FOUNDATION

Date: 2026-10-03
Status: **PASS**

---

## 1. Scope & Contract
- **Task**: Remediate PR-09A (Transactional Outbox + Contact persistence).
- **ADR-003 Compliance**:
  - `POST /api/contacts` executes inside an atomic DB transaction:
    1. `INSERT INTO contacts (...) RETURNING id`
    2. `INSERT INTO contact_outbox (...)`
  - Transaction commits both records atomically.
  - If outbox insert fails: Contact is rolled back immediately (zero orphaned contacts).
  - Returns `HTTP 202 Accepted` with semantic confirmation: `{"message": "Yêu cầu của bạn đã được tiếp nhận.", "id": "..."}`.
  - Zero emails sent, zero SMTP connections made (PR-09B scope).
  - No secret storage (PR-09C scope).

---

## 2. Table Definition & Migration 0003
- Table Name: `contact_outbox`
- Migration File: `api/drizzle/0003_red_hellfire_club.sql`
- Journal Entry: `idx: 3, tag: "0003_red_hellfire_club"` in `api/drizzle/meta/_journal.json`
- Schema Columns (10):
  1. `id` (`uuid`, PK, `gen_random_uuid()`)
  2. `contact_id` (`uuid`, FK -> `contacts.id`, `ON DELETE RESTRICT`)
  3. `event_type` (`varchar(100)`, not null, `'contact.notification.requested'`)
  4. `status` (`varchar(30)`, default `'pending'`, check constraint `in ('pending', 'processing', 'sent', 'failed')`)
  5. `attempt_count` (`integer`, default `0`)
  6. `next_attempt_at` (`timestamptz`, default `now()`)
  7. `last_error` (`text`, nullable)
  8. `processed_at` (`timestamptz`, nullable)
  9. `created_at` (`timestamptz`, default `now()`)
  10. `updated_at` (`timestamptz`, default `now()`)
- Indexes:
  - `contact_outbox_status_next_attempt_idx` (`status`, `next_attempt_at`)
  - `contact_outbox_contact_id_idx` (`contact_id`)

---

## 3. Real PostgreSQL Verification Summary
- **Database**: `neondb` (Neon Serverless PostgreSQL)
- **Pre-migration Backup**: `artifacts/final-03-remediation-2026-10-03/pr-09a/backup/backup_before_0003_2026-10-03T10-28-01-010Z.json` (50,289 bytes)
- **Migration Application**: `0003_red_hellfire_club.sql` applied cleanly.
- **Happy-path Verification**:
  - Contact fixture created in atomic transaction.
  - Contact in DB confirmed.
  - Outbox entry created: `status = 'pending'`, `attempt_count = 0`, `last_error = null`, `processed_at = null`, `event_type = 'contact.notification.requested'`.
  - Exact-one outbox event confirmed.
- **Forced Rollback Proof**:
  - Injected CHECK constraint violation into outbox insert.
  - Transaction aborted and threw error.
  - Verified contact row was rolled back and does not exist in DB (0 rows).
  - Contacts delta = 0, Outbox delta = 0.
- **Cleanup**:
  - Fixtures cleaned via `DELETE FROM contact_outbox` then `DELETE FROM contacts`.
  - Remaining fixtures: 0.
  - Existing contacts before migration (6) == after cleanup (6), fully intact.
  - Existing users (2) intact.
  - Migration 0003 and `contact_outbox` table remain active in schema.
