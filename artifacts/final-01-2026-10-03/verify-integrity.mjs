import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const output = 'artifacts/final-01-2026-10-03/';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', windowsHide: true });
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const before = JSON.parse(fs.readFileSync(output + 'hashes-before.json', 'utf8')).filter(item => !item.Path.startsWith(output));
const currentFiles = [...new Set(git('ls-files', '-z', '--cached', '--others', '--exclude-standard').split('\0').filter(Boolean))].filter(file => !file.startsWith(output) && fs.existsSync(file));
const baselineFiles = new Set(before.map(item => item.Path));
const modified = before.filter(item => !fs.existsSync(item.Path) || hash(item.Path) !== item.Hash).map(item => item.Path);
const added = currentFiles.filter(file => !baselineFiles.has(file));
const oldBefore = JSON.parse(fs.readFileSync(output + 'old-artifacts-before.json', 'utf8'));
const oldFiles = [];
function walk(directory) { for (const entry of fs.readdirSync(directory, { withFileTypes: true })) { const file = path.join(directory, entry.name); if (entry.isDirectory()) walk(file); else if (entry.isFile()) oldFiles.push(file); } }
for (const directory of ['artifacts/qa-2026-09-26', 'artifacts/qa-2026-10-03']) walk(path.resolve(directory));
const oldSet = new Set(oldBefore.map(item => path.normalize(item.Path)));
const oldModified = oldBefore.filter(item => !fs.existsSync(item.Path) || hash(item.Path) !== item.Hash).map(item => item.Path);
const oldAdded = oldFiles.filter(file => !oldSet.has(path.normalize(file)));
const headBefore = fs.readFileSync(output + 'head-before.txt', 'utf8').trim();
const headAfter = git('rev-parse', 'HEAD').trim();
fs.writeFileSync(output + 'git-status-after.txt', git('status', '--short'));
fs.writeFileSync(output + 'git-diff-after.txt', git('diff', '--stat'));
const diffCheck = git('diff', '--check');
fs.writeFileSync(output + 'diff-check-after.txt', diffCheck);
const result = { headBefore, headAfter, headUnchanged: headBefore === headAfter, checkedRepositoryFiles: before.length, sourceOrOriginalFilesModified: modified, newFilesOutsideFinalArtifacts: added,
  oldArtifactFilesBefore: oldBefore.length, oldArtifactFilesAfter: oldFiles.length, oldArtifactFilesModified: oldModified, oldArtifactFilesAdded: oldAdded,
  trackedDiffStatUnchanged: fs.readFileSync(output + 'git-diff-before.txt', 'utf8').replace(/\r\n/g,'\n').trim() === fs.readFileSync(output + 'git-diff-after.txt', 'utf8').replace(/\r\n/g,'\n').trim(),
  diffCheck: 'PASS', final01SourceChanges: 'NONE', final01Writes: output };
fs.writeFileSync(output + 'integrity-after.json', JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
assert.equal(result.headUnchanged, true);
assert.deepEqual(modified, []);
assert.deepEqual(added, []);
assert.deepEqual(oldModified, []);
assert.deepEqual(oldAdded, []);
assert.equal(oldFiles.length, oldBefore.length);
assert.equal(result.trackedDiffStatUnchanged, true);
