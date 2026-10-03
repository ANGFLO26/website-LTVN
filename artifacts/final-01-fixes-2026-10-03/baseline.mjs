import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
const output = 'artifacts/final-01-fixes-2026-10-03/';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', windowsHide: true, stdio: ['ignore','pipe','pipe'] });
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
fs.writeFileSync(output + 'head-before.txt', git('rev-parse', 'HEAD'));
fs.writeFileSync(output + 'git-status-before.txt', git('status', '--short'));
fs.writeFileSync(output + 'git-diff-before.txt', git('diff', '--stat'));
fs.writeFileSync(output + 'diff-check-before.txt', git('diff', '--check'));
const files = [...new Set(git('ls-files', '-z', '--cached', '--others', '--exclude-standard').split('\0').filter(Boolean))]
  .filter(file => !file.startsWith(output) && fs.existsSync(file));
fs.writeFileSync(output + 'files-before.json', JSON.stringify(files.map(file => ({ path: file, hash: hash(file) })),null,2));
const old = [];
function walk(directory) { for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
  const file = path.join(directory,entry.name); if (entry.isDirectory()) walk(file); else if (entry.isFile()) old.push({ path: file, hash: hash(file) });
} }
for (const directory of ['artifacts/qa-2026-09-26','artifacts/qa-2026-10-03','artifacts/final-01-2026-10-03']) walk(directory);
fs.writeFileSync(output + 'old-artifacts-before.json', JSON.stringify(old,null,2));
console.log(`Baseline saved: ${files.length} Git-listed files; ${old.length} protected artifact files; diff check PASS.`);
