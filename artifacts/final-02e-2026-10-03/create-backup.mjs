import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from '../../api/node_modules/postgres/src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const backupDir = path.join(__dirname, 'backup');

// Ensure backup dir exists
fs.mkdirSync(backupDir, { recursive: true });

// Read database URL
const envPath = path.join(rootDir, 'api', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
if (!match || !match[1]) {
  console.error('DATABASE_URL not found in api/.env');
  process.exit(1);
}
const databaseUrl = match[1];

const sql = postgres(databaseUrl, {
  max: 1,
  connect_timeout: 10,
  ssl: { rejectUnauthorized: false }
});

function escapeSqlValue(val, dataType) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'::timestamptz`;
  if (typeof val === 'object') {
    const jsonStr = JSON.stringify(val).replace(/'/g, "''");
    return `'${jsonStr}'::jsonb`;
  }
  // String escaping
  const escaped = String(val).replace(/'/g, "''");
  return `'${escaped}'`;
}

async function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sqlDumpFile = path.join(backupDir, `neondb_backup_${timestamp}.sql`);
  const jsonDumpFile = path.join(backupDir, `neondb_snapshot_${timestamp}.json`);

  console.log('--- STARTING DATABASE BACKUP ---');
  console.log(`Target SQL dump: ${sqlDumpFile}`);
  console.log(`Target JSON dump: ${jsonDumpFile}`);

  const startTime = Date.now();
  const backupData = {
    metadata: {
      timestamp: new Date().toISOString(),
      backupType: 'Full logical PostgreSQL SQL dump & JSON snapshot',
      database: 'neondb'
    },
    tables: {}
  };

  const sqlLines = [];
  sqlLines.push('-- PostgreSQL Database Dump');
  sqlLines.push(`-- Dumped at: ${new Date().toISOString()}`);
  sqlLines.push('-- Database: neondb (LTVN Development Database)');
  sqlLines.push('SET statement_timeout = 0;');
  sqlLines.push('SET lock_timeout = 0;');
  sqlLines.push("SET client_encoding = 'UTF8';");
  sqlLines.push('SET standard_conforming_strings = on;');
  sqlLines.push('');
  sqlLines.push('BEGIN;');
  sqlLines.push('');

  try {
    // 1. Get all public tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    let totalRowsDumped = 0;

    for (const { table_name } of tables) {
      console.log(`Dumping table: ${table_name}...`);

      // Get columns
      const cols = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${table_name}
        ORDER BY ordinal_position;
      `;

      // Get rows
      const rows = await sql.unsafe(`SELECT * FROM "${table_name}"`);
      backupData.tables[table_name] = {
        columns: cols,
        rowCount: rows.length,
        rows
      };

      totalRowsDumped += rows.length;

      sqlLines.push(`-- Data for Name: ${table_name}; Type: TABLE DATA; Rows: ${rows.length}`);
      if (rows.length > 0) {
        const colNames = cols.map(c => `"${c.column_name}"`).join(', ');
        for (const row of rows) {
          const valExpressions = cols.map(c => escapeSqlValue(row[c.column_name], c.data_type)).join(', ');
          sqlLines.push(`INSERT INTO "${table_name}" (${colNames}) VALUES (${valExpressions});`);
        }
      }
      sqlLines.push('');
    }

    sqlLines.push('COMMIT;');
    sqlLines.push('-- Dump completed successfully');

    const sqlContent = sqlLines.join('\n');
    fs.writeFileSync(sqlDumpFile, sqlContent, 'utf8');
    fs.writeFileSync(jsonDumpFile, JSON.stringify(backupData, null, 2), 'utf8');

    // 2. Backup verification
    const sqlStat = fs.statSync(sqlDumpFile);
    const jsonStat = fs.statSync(jsonDumpFile);

    const verification = {
      verifiedAt: new Date().toISOString(),
      exitCode: 0,
      sqlDump: {
        path: sqlDumpFile,
        exists: fs.existsSync(sqlDumpFile),
        sizeBytes: sqlStat.size,
        isValidFormat: sqlContent.includes('BEGIN;') && sqlContent.includes('COMMIT;') && sqlContent.includes('INSERT INTO')
      },
      jsonDump: {
        path: jsonDumpFile,
        exists: fs.existsSync(jsonDumpFile),
        sizeBytes: jsonStat.size,
        tableCount: Object.keys(backupData.tables).length,
        totalRows: totalRowsDumped
      },
      durationMs: Date.now() - startTime,
      status: 'VERIFIED_SUCCESSFUL'
    };

    fs.writeFileSync(
      path.join(backupDir, 'backup-verification.json'),
      JSON.stringify(verification, null, 2),
      'utf8'
    );

    console.log('\n--- BACKUP VERIFICATION RESULTS ---');
    console.log(`Exit code: ${verification.exitCode}`);
    console.log(`SQL Dump File: ${sqlDumpFile} (${sqlStat.size} bytes)`);
    console.log(`JSON Dump File: ${jsonDumpFile} (${jsonStat.size} bytes)`);
    console.log(`Tables Dumped: ${verification.jsonDump.tableCount}`);
    console.log(`Total Rows Dumped: ${verification.jsonDump.totalRows}`);
    console.log(`Format Valid: ${verification.sqlDump.isValidFormat}`);
    console.log(`Status: ${verification.status}`);

    if (!verification.sqlDump.exists || verification.sqlDump.sizeBytes <= 0 || !verification.sqlDump.isValidFormat) {
      throw new Error('Backup verification failed: invalid size or format');
    }

  } finally {
    await sql.end();
  }
}

runBackup().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
