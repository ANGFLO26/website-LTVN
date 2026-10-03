import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'

const output = 'artifacts/final-01-fixes-2026-10-03/'
const read = name => fs.readFileSync(output + name, 'utf8')
const json = name => JSON.parse(read(name))
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const canonical = file => file.replaceAll('\\', '/')
const allowedChanged = ['admin/src/services/api.ts', 'api/src/modules/news-events/news-events.service.ts', 'src/context/DataContext.tsx', 'api/test/news-mutation.e2e-spec.ts'].sort()
const allowedNew = ['api/test/news-vi-validation.e2e-spec.ts', 'scripts/final01-news-regression-browser.mjs'].sort()
const baseline = json('files-before.json')
const before = new Map(baseline.map(row => [canonical(row.path), row.hash]))
const now = [...new Set(git('ls-files', '-z', '--cached', '--others', '--exclude-standard').split('\0').filter(Boolean))]
  .filter(file => !file.startsWith(output) && fs.existsSync(file))
const changed = baseline.filter(row => fs.existsSync(row.path) && hash(row.path) !== row.hash).map(row => canonical(row.path)).sort()
const removed = baseline.filter(row => !fs.existsSync(row.path)).map(row => row.path)
const added = now.filter(file => !before.has(canonical(file))).map(canonical).sort()
assert.deepEqual(changed, allowedChanged, 'Only the three production fixes and existing mutation test changed')
assert.deepEqual(added, allowedNew, 'Only the two intended new test files exist outside the evidence folder')
assert.deepEqual(removed, [], 'No baseline file removed')

const oldAfter = []
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) walk(file)
    else if (entry.isFile()) oldAfter.push({ path: canonical(file), hash: hash(file) })
  }
}
for (const directory of ['artifacts/qa-2026-09-26', 'artifacts/qa-2026-10-03', 'artifacts/final-01-2026-10-03']) walk(directory)
const sorted = rows => rows.map(row => ({ ...row, path: canonical(row.path) })).sort((a, b) => a.path.localeCompare(b.path))
assert.deepEqual(sorted(oldAfter), sorted(json('old-artifacts-before.json')), 'Every protected artifact byte and file inventory preserved')
const head = git('rev-parse', 'HEAD').trim()
assert.equal(head, read('head-before.txt').trim(), 'HEAD unchanged')
const diffCheck = git('diff', '--check')
assert.equal(diffCheck, '')
fs.writeFileSync(output + 'git-status-after.txt', git('status', '--short'))
fs.writeFileSync(output + 'git-diff-after.txt', git('diff', '--stat'))
fs.writeFileSync(output + 'diff-check-final.txt', diffCheck)
const integrity = { result: 'PASS', head, existingFilesChecked: baseline.length, changed, added, removed,
  protectedArtifactFilesChecked: oldAfter.length, oldArtifactsByteIdentical: true,
  schemaAndMigrationByteIdentical: true, noOtherBaselineSourceChanged: true }
fs.writeFileSync(output + 'integrity-after.json', JSON.stringify(integrity, null, 2))

const suites = json('regression-results.json')
const targeted = json('browser/results.json')
assert.equal(suites.length, 14)
assert.ok(suites.every(row => row.exitCode === 0))
assert.equal(targeted.passed, 8)
assert.equal(targeted.total, 8)
assert.match(read('api-e2e.log'), /Tests\s+457 passed \(457\)/)
assert.match(read('api-e2e.log'), /Test Files\s+13 passed \(13\)/)
assert.match(read('api-unit.log'), /Tests\s+12 passed \(12\)/)
assert.match(read('schema-static.log'), /10\/10 tests passed/)
const responsive = json('qa16/results.json')
const metricArray = responsive.matrix
assert.equal(metricArray.length, 27)
assert.ok(metricArray.every(row => row.overflow === 0))
const report = `FINAL-01 FOLLOW-UP — B1/B2/B3 corrections and complete local regression, 2026-10-03

Outcome: LOCAL RELEASE CANDIDATE PASS – READY FOR ISOLATED POSTGRESQL TEST

The prior FINAL-01 report is preserved as historical audit evidence in ../final-01-2026-10-03/FINAL-01-AUDIT.txt.
This follow-up fixes only the three blockers identified there. All other previously audited source, database/schema/migrations, config and artifacts are byte-identical to the follow-up baseline.

Fix | Before | After | Evidence
B1 eventEndAt | Admin saveNewsEvent omitted end date on POST/PUT | ISO end date or explicit null is sent; omitted values remain omitted for partial update | Browser T1–T3; strengthened real Admin serializer/Nest mutation assertions
B2 required VI update fields | Invalid title/slug reached transaction and parent/VI rows | Invalid supplied title/slug rejected with 400 before transaction; valid values trimmed; omitted fields and EN preserved | 22 new authenticated API tests; zero transaction/writes for invalid cases
B3 legacy VI location | Public adapter discarded top-level legacy location without translations | Legacy VI location fallback only if authored VI translation is absent; authored empty/null stays cleared; no EN fallback | Browser T4–T7

Before-fix reproduction: targeted API tests 71/99 PASS, 28 expected failures; targeted browser 3/8 PASS, five expected failures.
After-fix production source changes: exactly three files, listed in integrity-after.json.
Test changes: existing news-mutation.e2e-spec.ts strengthened, two explicit-null end-date tests added; new news-vi-validation.e2e-spec.ts with 22 tests; new final01-news-regression-browser.mjs with 8 tests.
API count increase: 433 -> 457 (+22 VI validation and +2 end-date null tests). 12 -> 13 test files.

Build/check matrix
npm run build: PASS
npm run build:admin: PASS
npm run build:api: PASS
npm run lint: PASS
git diff --check: PASS
npm --prefix api run test:e2e: 13/13 files, 457/457 PASS
npm --prefix api run test: 2/2 files, 12/12 PASS
node scripts/qa14c1-schema-test.mjs: 10/10 PASS
npm --prefix api run lint: unchanged baseline FAIL (seed.ts:1727 no-floating-promises); 7 unchanged warnings. No new error/warning and seed.ts unchanged from HEAD. No out-of-scope fix.
Expected simulated database-insert exception in API test log belongs to the existing negative-case test, not a real DB operation.

Full browser regression
Suite | PASS checkpoints | Exit
${suites.map(row => `${row.suite} | ${row.passCheckpoints} | ${row.exitCode}`).join('\n')}
14/14 suites PASS; ${suites.reduce((sum, row) => sum + row.passCheckpoints, 0)} checkpoints PASS.
Additional targeted browser: 8/8 PASS; no JS page errors; external traffic aborted and API mocked.
QA-16 exercises 375x812, 768x900, 1440x900; its 15 tests PASS. Page metrics stored in qa16/results.json${metricArray ? ` (${metricArray.length} entries)` : ''}.
QA-14C4 and QA-15 used their existing output-env settings. QA-16 used an artifact copy with only the output path redirected; reverse substitution confirms original assertions unchanged.
QA-02/03/07 have no separate dedicated browser script; their existing API harnesses ran in the full API suite.

Repository integrity
HEAD unchanged: ${head}
${baseline.length} baseline Git-listed files verified. Changed existing files: ${changed.join(', ')}.
New test files: ${added.join(', ')}. Removed baseline files: NONE.
All ${oldAfter.length} files across the two original QA artifact folders and prior FINAL-01 evidence folder are byte-identical; no files added or removed there.
All database/schema/migration files unchanged; migration static checks remain 10/10 PASS.
Current cumulative git state and full diff stat: git-status-after.txt and git-diff-after.txt.
${git('diff', '--stat').trim().split('\n').at(-1).trim()}
No commit/push/reset/revert/stash/deploy/cleanup.

Remaining blocking issues: NONE
Non-blocking/deferred debt retained from prior audit: Machines legacy translator; Contacts Admin/editor UI legacy scope; read-only initial Admin fallback/cache; nullable-content/full-author interface typing; placeholder user password provisioning; API lint baseline; database fallback/config documentation limitations and original translation harness mock coverage limits.
Real PostgreSQL and migration execution remain a separate, unstarted acceptance stage.

REAL POSTGRESQL TEST: NOT EXECUTED
MIGRATION: NOT EXECUTED

LOCAL RELEASE CANDIDATE PASS – READY FOR ISOLATED POSTGRESQL TEST
`
fs.writeFileSync(output + 'FINAL-01-FOLLOW-UP.txt', report)
console.log(`Integrity PASS: ${baseline.length} baseline files, ${oldAfter.length} preserved artifact files; ${changed.length} intended modifications and ${added.length} new tests.`)
console.log('LOCAL RELEASE CANDIDATE PASS – READY FOR ISOLATED POSTGRESQL TEST')
