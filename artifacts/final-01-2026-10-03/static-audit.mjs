import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const output = path.join(root, 'artifacts/final-01-2026-10-03');
const readJson = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true });
const normalize = value => Array.isArray(value) ? value.map(normalize) : value && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => [key, normalize(val)]))
  : value;
const same = (a,b) => JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));

const { generateDrizzleJson } = await import(pathToFileURL(path.join(root, 'api/node_modules/drizzle-kit/api.mjs')));
const schema = await import(pathToFileURL(path.join(root, 'api/dist/database/schema.js')));
const initial = readJson('api/drizzle/meta/0000_snapshot.json');
const latest = readJson('api/drizzle/meta/0001_snapshot.json');
const journal = readJson('api/drizzle/meta/_journal.json');
// Offline schema serialization only. No database client, migration generation or execution.
const current = generateDrizzleJson(schema, initial.id);
const sqlInitial = fs.readFileSync(path.join(root, 'api/drizzle/0000_known_stryfe.sql'), 'utf8');
const sqlAdditive = fs.readFileSync(path.join(root, 'api/drizzle/0001_add_news_event_translations.sql'), 'utf8');
const sqlCombined = sqlInitial + '\n' + sqlAdditive;
const sqlIssues = [];
const sqlNormalize = text => String(text).replace(/\s+/g, ' ').trim().toLowerCase();
for (const table of Object.values(latest.tables)) {
  const block = [...sqlCombined.matchAll(/CREATE TABLE "([^"]+)" \(([\s\S]*?)\r?\n\);/g)].find(match => match[1] === table.name)?.[2];
  if (!block) { sqlIssues.push('Missing SQL table ' + table.name); continue; }
  const columns = [...block.matchAll(/^\s*"([^"]+)" ([^\r\n]+)$/gm)];
  if (columns.length !== Object.keys(table.columns).length) sqlIssues.push('Column count mismatch ' + table.name);
  for (const column of Object.values(table.columns)) {
    const definition = columns.find(match => match[1] === column.name)?.[2];
    if (!definition) { sqlIssues.push('Missing column ' + table.name + '.' + column.name); continue; }
    const type = definition.split(/\s+(?:PRIMARY KEY|DEFAULT|NOT NULL)/)[0].replace(/,$/, '');
    if (sqlNormalize(type) !== sqlNormalize(column.type)) sqlIssues.push('Type mismatch ' + table.name + '.' + column.name);
    if (/NOT NULL/.test(definition) !== column.notNull) sqlIssues.push('Nullability mismatch ' + table.name + '.' + column.name);
    if (/PRIMARY KEY/.test(definition) !== column.primaryKey) sqlIssues.push('Primary key mismatch ' + table.name + '.' + column.name);
    const defaultValue = /DEFAULT ([\s\S]*?)(?: NOT NULL|,$|$)/.exec(definition)?.[1];
    if (!same(defaultValue === undefined ? undefined : sqlNormalize(defaultValue), column.default === undefined ? undefined : sqlNormalize(column.default))) sqlIssues.push('Default mismatch ' + table.name + '.' + column.name);
  }
  for (const unique of Object.values(table.uniqueConstraints)) {
    const text = 'CONSTRAINT "' + unique.name + '" UNIQUE(' + unique.columns.map(c => '"' + c + '"').join(',') + ')';
    if (!block.includes(text)) sqlIssues.push('Unique constraint mismatch ' + unique.name);
  }
  for (const check of Object.values(table.checkConstraints)) {
    const text = 'CONSTRAINT "' + check.name + '" CHECK (' + check.value + ')';
    if (!sqlNormalize(block).includes(sqlNormalize(text))) sqlIssues.push('Check mismatch ' + check.name);
  }
  for (const fk of Object.values(table.foreignKeys)) {
    const columns = fk.columnsFrom.map(c => '"' + c + '"').join(',');
    const target = fk.columnsTo.map(c => '"' + c + '"').join(',');
    const text = 'ALTER TABLE "' + table.name + '" ADD CONSTRAINT "' + fk.name + '" FOREIGN KEY (' + columns + ') REFERENCES "public"."' + fk.tableTo + '"(' + target + ') ON DELETE ' + fk.onDelete + ' ON UPDATE ' + fk.onUpdate;
    if (!sqlNormalize(sqlCombined).includes(sqlNormalize(text))) sqlIssues.push('FK mismatch ' + fk.name);
  }
  for (const index of Object.values(table.indexes)) {
    const columns = index.columns.map(c => '"' + c.expression + '"').join(',');
    const text = 'CREATE INDEX "' + index.name + '" ON "' + table.name + '" USING ' + index.method + ' (' + columns + ')';
    if (!sqlNormalize(sqlCombined).includes(sqlNormalize(text))) sqlIssues.push('Index mismatch ' + index.name);
  }
}
const keys = ['version', 'dialect', 'tables', 'enums', 'schemas', 'sequences', 'roles', 'policies', 'views', '_meta'];
const differences = keys.filter(key => !same(current[key], latest[key]));
const addedTables = Object.keys(latest.tables).filter(key => !initial.tables[key]);
const alteredLegacyTables = Object.keys(initial.tables).filter(key => !same(initial.tables[key], latest.tables[key]));
const sequenceValid = journal.entries.every((item, i) => item.idx === i && fs.existsSync(path.join(root, 'api/drizzle', item.tag + '.sql')) && (i === 0 || item.when > journal.entries[i-1].when));
const result = {
  mode: 'OFFLINE ONLY; NO DATABASE; NO MIGRATION EXECUTION',
  currentSchemaMatchesLatestSnapshot: differences.length === 0,
  differences, addedTables, alteredLegacyTables,
  snapshotChainValid: latest.prevId === initial.id,
  sequenceValid,
  snapshotTableCounts: { initial: Object.keys(initial.tables).length, latest: Object.keys(latest.tables).length },
  sqlMatchesSnapshot: sqlIssues.length === 0, sqlIssues,
  migrationSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'api/drizzle/0001_add_news_event_translations.sql'))).digest('hex'),
};
fs.writeFileSync(path.join(output, 'migration-consistency.json'), JSON.stringify(result, null, 2));

const modified = git('diff', '--name-only', '-z').split('\0').filter(Boolean);
const added = git('ls-files', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean).filter(file => !file.startsWith('artifacts/final-01-2026-10-03/'));
const classify = file => file.startsWith('artifacts/') ? 'Artifacts'
  : file.startsWith('scripts/qa') ? 'QA scripts'
  : file.startsWith('api/test/') || (file.startsWith('api/') && /\.spec\.ts$/.test(file)) ? 'Tests'
  : file.startsWith('api/drizzle/') || file === 'api/src/database/schema.ts' ? 'Database/schema/migration'
  : /(?:^|\/)(?:\.env\.example|package(?:-lock)?\.json|[^/]+\.md)$/.test(file) ? 'Documentation/config'
  : file.startsWith('src/') ? 'Public frontend'
  : file.startsWith('admin/') ? 'Admin frontend'
  : file.startsWith('api/') ? 'API' : 'UNCLASSIFIED';
const areas = ['Public frontend','Admin frontend','API','Database/schema/migration','Tests','QA scripts','Documentation/config','Artifacts','UNCLASSIFIED'];
const inventory = areas.map(area => ({ area, modified: modified.filter(file => classify(file) === area), new: added.filter(file => classify(file) === area) }));
fs.writeFileSync(path.join(output, 'inventory.json'), JSON.stringify(inventory, null, 2));
console.log(JSON.stringify(result, null, 2));
console.table(inventory.map(item => ({ Area: item.area, Modified: item.modified.length, New: item.new.length })));
assert.equal(sequenceValid, true, 'Invalid migration sequence');
assert.equal(result.snapshotChainValid, true, 'Snapshot chain mismatch');
assert.deepEqual(addedTables, ['public.news_event_translations']);
assert.deepEqual(alteredLegacyTables, []);
assert.deepEqual(differences, [], 'Current schema/snapshot mismatch');
assert.deepEqual(sqlIssues, [], 'SQL/snapshot mismatch');
assert.equal(inventory.find(item => item.area === 'UNCLASSIFIED').modified.length + inventory.find(item => item.area === 'UNCLASSIFIED').new.length, 0);
