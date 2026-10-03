import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const output = path.resolve('artifacts/final-01-2026-10-03')
const oldPath = 'artifacts/qa-2026-10-03/qa16'
const newPath = 'artifacts/final-01-2026-10-03/qa16'
const source = await readFile('scripts/qa16-admin-responsive-browser.mjs', 'utf8')
assert.equal(source.split(oldPath).length, 2)
const redirected = source.replace(oldPath, newPath)
assert.equal(redirected.replace(newPath, oldPath), source, 'Only output path changed; all assertions preserved')
const copyPath = path.join(output, 'qa16-output-redirect.mjs')
await writeFile(copyPath, redirected)
await writeFile(path.join(output, 'harness-output-redirect.json'), JSON.stringify({
  original: 'scripts/qa16-admin-responsive-browser.mjs', outputOnlyReplacement: [oldPath, newPath],
  sourceSHA256: createHash('sha256').update(source).digest('hex'),
  assertionsUnchanged: true,
  originalsModified: false,
}, null, 2))
const suites = ['qa01-auth-browser', 'qa04-mutation-browser', 'qa05-contact-browser', 'qa06-about-browser',
  'qa08-contact-browser', 'qa09-contact-browser', 'qa10-empty-state-browser', 'qa11-detail-state-browser',
  'qa12-article-blocks-browser', 'qa13-baker-links-browser', 'qa14c3-admin-bilingual-browser',
  'qa14c4-public-bilingual-browser', 'qa15-admin-urls-browser', 'qa16-admin-responsive-browser']
const results = []
async function run(id, command, args, env = {}) {
  let stdout = '', stderr = ''
  const started = Date.now()
  const child = spawn(command, args, { cwd: root, env: { ...process.env, NO_COLOR: '1', ...env }, windowsHide: true })
  child.stdout.on('data', data => { stdout += data.toString() })
  child.stderr.on('data', data => { stderr += data.toString() })
  const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve) })
  await writeFile(path.join(output, id + '.log'), stdout + stderr)
  const result = { suite: id, command: [command, ...args], exitCode: code, result: code === 0 ? 'PASS' : 'FAIL',
    passCheckpoints: (stdout.match(/^PASS(?:\s|:)/gm) || []).length, durationSeconds: (Date.now() - started) / 1000 }
  results.push(result)
  await writeFile(path.join(output, 'regression-results.json'), JSON.stringify(results, null, 2))
  console.log(`${id}: ${result.result}; ${result.passCheckpoints} PASS checkpoints; exit ${code}`)
}
let cursor = 0
async function worker() {
  while (cursor < suites.length) {
    const id = suites[cursor++]
    const env = id.startsWith('qa14c4') ? { QA14C4_OUTPUT: path.join(output, 'qa14c4') }
      : id.startsWith('qa15') ? { QA15_OUTPUT_DIR: path.join(output, 'qa15') } : {}
    await run(id, process.execPath, [id.startsWith('qa16') ? copyPath : 'scripts/' + id + '.mjs'], env)
  }
}
await mkdir(output, { recursive: true })
await Promise.all([worker(), worker()])
assert.equal(results.length, 14)
console.log(`FULL BROWSER REGRESSION: ${results.filter(r => r.exitCode === 0).length}/14 suites PASS`)
process.exitCode = results.some(r => r.exitCode !== 0) ? 1 : 0
