import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(scriptPath), '..');

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

/** No database connection is made while validating the explicit operator request. */
export function validateBackupRequest(env = process.env, root = projectRoot) {
  for (const key of ['BACKUP_DATABASE_URL', 'BACKUP_EXPECTED_HOST', 'BACKUP_EXPECTED_DATABASE', 'BACKUP_OUTPUT_DIR']) {
    if (!env[key]) throw new Error(`Missing required setting: ${key}`);
  }
  if (env.BACKUP_AUTHORIZED_TARGET !== 'YES') {
    throw new Error('BACKUP_AUTHORIZED_TARGET=YES is required for an explicitly authorized target.');
  }

  let url;
  try { url = new URL(env.BACKUP_DATABASE_URL); } catch { throw new Error('Invalid BACKUP_DATABASE_URL.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.pathname || url.pathname === '/') {
    throw new Error('BACKUP_DATABASE_URL must identify a PostgreSQL host and database.');
  }
  const database = decodeURIComponent(url.pathname.slice(1));
  if (url.hostname.toLowerCase() !== env.BACKUP_EXPECTED_HOST.toLowerCase() || database !== env.BACKUP_EXPECTED_DATABASE) {
    throw new Error('Backup target does not match the explicitly expected host and database.');
  }

  const outputDir = path.resolve(env.BACKUP_OUTPUT_DIR);
  const canonicalRoot = fs.realpathSync(root);
  if (isInside(canonicalRoot, outputDir)) {
    throw new Error('Backup output directory must be outside the repository.');
  }
  // Check existing parents before creating a directory, including symlink targets.
  let existing = outputDir;
  while (!fs.existsSync(existing)) existing = path.dirname(existing);
  const canonicalExisting = fs.realpathSync(existing);
  if (isInside(canonicalRoot, canonicalExisting)) {
    throw new Error('Backup output directory resolves inside the repository.');
  }

  return { url, database, outputDir, root: canonicalRoot };
}

function runChecked(command, args, options, runner) {
  const result = runner(command, args, { windowsHide: true, encoding: 'utf8', timeout: 10 * 60_000, maxBuffer: 4 * 1024 * 1024, ...options });
  if (result.error || result.status !== 0) {
    // pg tools may echo connection details in stderr. Never forward their raw text.
    throw new Error(`${command} failed; inspect the database tool securely on the backup host.`);
  }
  return result.stdout || '';
}

/** Full schema + data custom-format dump. The archive is never placed in Git. */
export function createPostgresBackup(config, runner = spawnSync) {
  fs.mkdirSync(config.outputDir, { recursive: true, mode: 0o700 });
  const canonicalOutput = fs.realpathSync(config.outputDir);
  if (isInside(config.root, canonicalOutput)) throw new Error('Backup output resolves inside repository.');

  const fileName = `ltvn-${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomBytes(4).toString('hex')}.dump`;
  const dumpPath = path.join(canonicalOutput, fileName);
  const partialPath = `${dumpPath}.partial`;
  const pgEnv = {
    ...process.env,
    PGHOST: config.url.hostname,
    PGPORT: config.url.port || '5432',
    PGUSER: decodeURIComponent(config.url.username),
    PGPASSWORD: decodeURIComponent(config.url.password),
    PGDATABASE: config.database,
    PGSSLMODE: config.url.searchParams.get('sslmode') || 'prefer',
  };

  // No table list or data-only flag: pg_dump includes the selected database's
  // schema and data. Credentials are passed in the child environment, not argv.
  runChecked('pg_dump', ['--format=custom', '--no-password', `--file=${partialPath}`], { env: pgEnv }, runner);
  const size = fs.statSync(partialPath).size;
  if (size === 0) throw new Error('pg_dump produced an empty archive.');
  const toc = runChecked('pg_restore', ['--list', partialPath], { env: pgEnv }, runner);
  if (!toc.trim()) throw new Error('pg_restore returned an empty table of contents.');

  const hasher = crypto.createHash('sha256');
  const descriptor = fs.openSync(partialPath, 'r');
  try {
    const chunk = Buffer.allocUnsafe(1024 * 1024);
    let bytesRead;
    while ((bytesRead = fs.readSync(descriptor, chunk, 0, chunk.length, null)) > 0) {
      hasher.update(chunk.subarray(0, bytesRead));
    }
  } finally {
    fs.closeSync(descriptor);
  }
  const digest = hasher.digest('hex');
  fs.renameSync(partialPath, dumpPath);
  const metadata = {
    type: 'POSTGRESQL_CUSTOM_FORMAT',
    createdAt: new Date().toISOString(),
    bytes: size,
    sha256: digest,
    pgRestoreList: 'PASS',
    restoreVerified: false,
    restoreTest: 'PENDING INFRASTRUCTURE',
  };
  const metadataPath = `${dumpPath}.metadata.json`;
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), { mode: 0o600, flag: 'wx' });
  return { dumpPath, metadataPath, metadata };
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  try {
    const result = createPostgresBackup(validateBackupRequest());
    console.log(`Custom-format PostgreSQL dump created outside repository: ${result.dumpPath}`);
    console.log('pg_restore -l: PASS; RESTORE TEST: PENDING INFRASTRUCTURE');
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Backup failed.');
    process.exitCode = 1;
  }
}
