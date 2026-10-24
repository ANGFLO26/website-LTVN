# PostgreSQL backup and restore verification

`scripts/backup-db.mjs` runs a full-schema and data `pg_dump --format=custom`. It does not automatically read `backend/.env`, run migrations, or connect to a database without all explicit settings below:

| Environment setting | Meaning |
| --- | --- |
| `BACKUP_DATABASE_URL` | Operator-provided PostgreSQL connection URI from a secret manager |
| `BACKUP_EXPECTED_HOST` | Exact expected hostname |
| `BACKUP_EXPECTED_DATABASE` | Exact expected database name |
| `BACKUP_OUTPUT_DIR` | Restricted directory outside this repository |
| `BACKUP_AUTHORIZED_TARGET` | Must equal `YES` after target and storage have been approved |

Install matching PostgreSQL client tools (`pg_dump`, `pg_restore`) on the backup host. Set the variables in the process environment through an approved secret delivery mechanism and run `node scripts/backup-db.mjs` (or `npm run db:backup`). Do not put the URI in command-line arguments or a tracked file. Restrict access to the output directory, encrypt and retain the archive according to the organization's backup policy, and keep it outside source control and release packages.

The script requires a zero exit code from `pg_dump`, a nonempty archive, and a successful `pg_restore --list`. It writes SHA-256 metadata beside the dump. This checks archive structure only; it **does not prove a successful restore**.

For `RESTORE VERIFIED`, restore the archive into an explicitly authorized, isolated PostgreSQL database using `pg_restore --exit-on-error --dbname=<isolated target> <dump>`. Compare schema objects, row counts and key business records with the source under the approved validation plan, then record the result separately. Never restore into a live or business DEV database for this drill. Until that succeeds: **RESTORE TEST: PENDING INFRASTRUCTURE**.
