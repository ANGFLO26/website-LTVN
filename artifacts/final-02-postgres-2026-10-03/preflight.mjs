import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'

const output = 'artifacts/final-02-postgres-2026-10-03/'
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', windowsHide: true, stdio: ['ignore','pipe','pipe'] })
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
fs.writeFileSync(output + 'head-before.txt', git('rev-parse', 'HEAD'))
fs.writeFileSync(output + 'git-status-before.txt', git('status', '--short'))
fs.writeFileSync(output + 'git-diff-before.txt', git('diff', '--stat'))
fs.writeFileSync(output + 'diff-check-before.txt', git('diff', '--check'))
const files = [...new Set(git('ls-files', '-z', '--cached', '--others', '--exclude-standard').split('\0').filter(Boolean))]
  .filter(file => !file.startsWith(output) && fs.existsSync(file))
fs.writeFileSync(output + 'files-before.json', JSON.stringify(files.map(file => ({ path: file, hash: hash(file) })),null,2))
const old = []
function walk(directory) { for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
  const file = path.join(directory,entry.name); if (entry.isDirectory()) walk(file); else if (entry.isFile()) old.push({ path: file, hash: hash(file) })
} }
for (const directory of ['artifacts/qa-2026-09-26','artifacts/qa-2026-10-03','artifacts/final-01-2026-10-03','artifacts/final-01-fixes-2026-10-03']) walk(directory)
fs.writeFileSync(output + 'old-artifacts-before.json', JSON.stringify(old,null,2))
const safety = {
  audited: ['api/package.json','api/drizzle.config.ts','api/src/database/schema.ts','api/src/database/database.module.ts','api/src/database/seed.ts (bootstrap only, not executed)', 'api/src/app.module.ts','api/src/main.ts','api/.env (keys/host classification only)','api/.env.example','admin/.env.example','api/drizzle/0000_known_stryfe.sql','api/drizzle/0001_add_news_event_translations.sql','api/drizzle/meta/_journal.json'],
  existingProjectDatabaseUrlUsed: false, existingShellDatabaseUrlUsed: false,
  existingApiEnv: 'non-local URL present; forbidden and ignored',
  docker: 'not installed/available', wsl: 'no local distro available',
  existingPostgresData: 'C:/Program Files/PostgreSQL/18/data exists; NEVER OPENED/CONNECTED/MODIFIED',
  strategy: 'Official EDB Windows x64 portable runtime, new isolated initdb cluster in dedicated temporary directory; loopback-only separate process/port; no Windows service; no existing data/volume',
  host: '127.0.0.1', database: 'ltvn_final02_test', user: 'ltvn_final02', port: 'dedicated free port selected before initialization',
  credentials: 'generated in memory; temporary initdb pwfile deleted immediately; never logged',
  migrationMechanism: 'Project Drizzle postgres-js migrator; immutable artifact copy of original migration folder with 0000-only journal for phase A, then full original journal for phase B; original SQL/hash unchanged',
  prerequisites: 'assert own postmaster PID/data_directory/loopback port, exact database and user, public table count=0 before migration',
  noSeed: true, noProductionSourceChange: true,
  runtimeSources: ['https://www.postgresql.org/download/windows/','https://www.enterprisedb.com/download-postgresql-binaries','https://sbp.enterprisedb.com/getfile.jsp?fileid=1260609']
}
fs.writeFileSync(output + 'safety-preflight.json', JSON.stringify(safety,null,2))
console.log(`Safety preflight recorded; ${files.length} source/evidence baseline files, ${old.length} old artifact files preserved. No DB connection performed.`)
