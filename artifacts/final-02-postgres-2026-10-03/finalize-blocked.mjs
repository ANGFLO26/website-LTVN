import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
const output='artifacts/final-02-postgres-2026-10-03/'
const read=name=>fs.readFileSync(output+name,'utf8').replace(/^\uFEFF/,'')
const json=name=>JSON.parse(read(name))
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']})
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const canonical=file=>file.replaceAll('\\','/')
const baseline=json('files-before.json')
assert.deepEqual(baseline.filter(row=>!fs.existsSync(row.path)||hash(row.path)!==row.hash),[],'All baseline source/tests/config/evidence unchanged')
const names=new Set(baseline.map(row=>canonical(row.path)))
const after=[...new Set(git('ls-files','-z','--cached','--others','--exclude-standard').split('\0').filter(Boolean))].filter(file=>!file.startsWith(output)&&fs.existsSync(file))
assert.deepEqual(after.filter(file=>!names.has(canonical(file))),[],'No file added outside FINAL02 evidence directory')
const artifacts=[]
function walk(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())walk(file);else if(entry.isFile())artifacts.push({path:canonical(file),hash:hash(file)})}}
for(const directory of ['artifacts/qa-2026-09-26','artifacts/qa-2026-10-03','artifacts/final-01-2026-10-03','artifacts/final-01-fixes-2026-10-03'])walk(directory)
const sorted=rows=>rows.map(row=>({...row,path:canonical(row.path)})).sort((a,b)=>a.path.localeCompare(b.path))
assert.deepEqual(sorted(artifacts),sorted(json('old-artifacts-before.json')),'All prior artifact folders byte-identical')
const head=git('rev-parse','HEAD').trim();assert.equal(head,read('head-before.txt').trim())
assert.equal(git('diff','--check'),'');assert.equal(git('diff','--stat'),read('git-diff-before.txt'))
fs.writeFileSync(output+'git-status-after.txt',git('status','--short'))
fs.writeFileSync(output+'git-diff-after.txt',git('diff','--stat'))
fs.writeFileSync(output+'diff-check-after.txt',git('diff','--check'))
const integrity={result:'PASS',head,sourceChanges:'NONE',testSourceChanges:'NONE',schemaMigrationChanges:'NONE',filesVerified:baseline.length,oldArtifactFilesVerified:artifacts.length,oldArtifactsByteIdentical:true,addedOutsideFinal02:[],removed:[],commitPushResetRevertStash:false}
fs.writeFileSync(output+'integrity-after.json',JSON.stringify(integrity,null,2))
const target=json('connection-target.json'),cleanup=json('cleanup-blocked.json'),blocker=json('runtime-blocker.json')
assert.equal(cleanup.runtimeRemoved,true);assert.equal(cleanup.testDatabaseCreated,false)
const report=`FINAL-02 — isolated real PostgreSQL integration: BLOCKED at runtime safety gate, 2026-10-03

A. Safety preflight
Host: ${target.host} (planned loopback target)
Port: ${target.port} (free port selected for first bootstrap attempt; server NEVER STARTED)
Database: ${target.database} (NOT CREATED)
User: ${target.user} (NOT PROVISIONED)
Isolation method: fresh portable PostgreSQL native cluster in a unique FINAL02 temporary directory, no service/shared volume/existing data.
Redacted planned URL: ${target.redactedUrl}
Existing project DATABASE_URL used? NO
Existing shell DATABASE_URL used? NO
api/.env contains a non-local URL; only keys/host classification audited, NEVER CONNECTED.
Docker executable/runtime unavailable. WSL has no available distro. C:/Program Files/PostgreSQL/18/data exists, but no installed binaries; existing data NEVER opened/copied/connected/modified.
Official EDB PostgreSQL 18.6 Windows x64 portable archive downloaded; server --version worked. Archive SHA256: e2246ba91d22345bc3d017586c09ede52d9df180b1eeb480f050445f1cad84e2.
initdb launch blocked by Windows Application Control. Node first reported spawn UNKNOWN; independent PowerShell --version returned exact error: "${blocker.observedError}"
initdb binary SHA256: ${blocker.initdbBinarySHA256}; version metadata: ${blocker.versionMetadata}.
No policy bypass, renaming/repackaging to evade policy, or existing DB fallback attempted.
Safety decision: STOP before any database connection/migration.

B. Empty database proof
NOT EXECUTED: database not created; public-table count is UNVERIFIED, never assumed zero.
C. Migration 0000 result
NOT EXECUTED. No journal/schema created in any database.
D. Pre-0001 legacy fixture
NOT INSERTED.
E. Migration 0001 result
NOT EXECUTED.
F. Backfill verification
NOT EXECUTED; exact VI comparison/zero EN remain unproven on real PostgreSQL.
G. Constraints C1–C5
C1 locale CHECK: NOT EXECUTED
C2 event+locale UNIQUE: NOT EXECUTED
C3 global slug UNIQUE: NOT EXECUTED
C4 FK: NOT EXECUTED
C5 cascade: NOT EXECUTED
H. Real Auth
NOT EXECUTED. No test Admin/JWT created, no guard bypass, no Nest API boot.
I. Real CRUD matrix
Module | Create | Read | Update | Delete | Public visibility | Result
Users | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED | UNPROVEN
Standards | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED | UNPROVEN
Media | NOT EXECUTED | NOT EXECUTED | N/A (no UPDATE endpoint) | NOT EXECUTED | NOT EXECUTED | UNPROVEN
Machines | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED | UNPROVEN
News | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED | UNPROVEN
Contacts | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED | UNPROVEN
J. News VI-only DB proof: NOT EXECUTED
K. News bilingual DB proof: NOT EXECUTED
L. B1 real DB end-date create/update/null: NOT EXECUTED
M. B2 real DB invalid-update rejection and equality: NOT EXECUTED
N. VI-only/EN-only update isolation: NOT EXECUTED
O. Policy A real API visibility: NOT EXECUTED
P. B3 legacy location real API/browser: NOT EXECUTED
Q. Transaction rollback proof
NOT EXECUTED. Prepared deterministic CREATE failure: reuse existing translation slug in new EN after parent and VI inserts. Prepared UPDATE failure: set VI slug to existing EN slug absent from parent table, forcing translation failure after parent mutation. No test trigger required/created. Parent/translation row counts UNVERIFIED.
R. Data integrity checks
Orphans/duplicates/invalid locale: NOT EXECUTED; no claim of zero made.
S. Mock-vs-real classification
REAL PostgreSQL persistence tests: NONE EXECUTED.
Database connections: 0. Migrations executed: 0. Actual API requests: 0.
Browser mocked regressions: NOT rerun in FINAL02; prior FINAL01 results are historical, not real DB evidence.
Prepared integration.mjs/real-cases.mjs/real-browser.mjs use actual installed postgres-js/Drizzle/Nest and an HTTP proxy, no persistence mocks, but their real-DB test bodies never ran because initdb was blocked.
T. Regression after integration
Post-integration matrix NOT EXECUTED because integration never began. Pre-integration npm run build:api PASS (build-api-before.log).
Last known FINAL01 regressions: API 457/457, unit12/12,14/14 browser suites, targeted8/8, schema10/10; NOT claimed as rerun or PostgreSQL proof in FINAL02.
U. Source/git integrity
HEAD unchanged: ${head}
${baseline.length} Git-listed baseline files unchanged; ${artifacts.length} old artifact files byte-identical; no added/removed files outside FINAL02 evidence.
Source/schema/migration/test source changes: NONE. Only new harnesses/logs/evidence under artifacts/final-02-postgres-2026-10-03/; no reusable file added under api/test or scripts.
git diff --check: PASS. git diff --stat identical to baseline: 49 files changed, 3010 insertions(+), 695 deletions(-).
Exact git status and diff stat saved as git-status-after.txt and git-diff-after.txt.
V. Cleanup proof
Attempt01 temporary runtime removed by finally; cleanup.json archived in attempt-01/.
Second temporary runtime removed: ${cleanup.runtimeRoot}
Verification: runtime path absent=true, running processes from that path=0, data directory never created.
No database/container existed to drop/remove; no API/PG server started; no test-only trigger created.
No existing developer data, service, container or DB affected.
W. Remaining issues / technical debt
Blocking: local PostgreSQL initdb execution is prohibited by Windows Application Control, with no Docker/WSL alternative currently available; all required real DB acceptance remains unproven.
Non-blocking: unchanged FINAL01 debts (API lint seed baseline, Contacts Admin/editor legacy scope, read cache/defaults and config/docs drift).
Deferred: migration/backfill/constraints/CRUD/auth/rollback real DB acceptance; Machines translator and production-readiness configuration review.
To resume: supply an available isolated local Docker runtime, or have the official PostgreSQL initdb binary permitted by the applicable Windows Application Control policy through its authorized administration workflow. No security-policy bypass was attempted.
X. Final database status
ISOLATED POSTGRESQL TEST: NOT EXECUTED — BLOCKED
MIGRATION: NOT EXECUTED
PRODUCTION DATABASE: NOT TOUCHED
TEST DATABASE: NOT CREATED
TEMPORARY RUNTIME: CLEANED UP
Y. Final verdict
FINAL-02 BLOCKED
`
fs.writeFileSync(output+'FINAL-02-REPORT.txt',report)
console.log(`Integrity PASS: ${baseline.length} unchanged files; ${artifacts.length} old artifact files byte-identical; HEAD/diff unchanged.`)
console.log('FINAL-02 BLOCKED: Windows Application Control prevented initdb; no database command/connection executed.')
