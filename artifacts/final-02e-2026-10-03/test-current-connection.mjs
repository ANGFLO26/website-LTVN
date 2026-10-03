import fs from 'node:fs';
import path from 'node:path';
import postgres from '../../api/node_modules/postgres/src/index.js';

const envContent = fs.readFileSync(path.resolve('api/.env'), 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
if (!match || !match[1]) {
  console.log('NO_DATABASE_URL');
  process.exit(1);
}

const sql = postgres(match[1], {
  max: 1,
  connect_timeout: 5,
  ssl: { rejectUnauthorized: false }
});

try {
  const [r] = await sql`SELECT current_database(), current_user, version()`;
  console.log('STATUS: CONNECTED');
  console.log('DB:', r.current_database);
  console.log('USER:', r.current_user);
} catch (err) {
  console.log('STATUS: FAILED');
  console.log('CODE:', err.code);
  console.log('MSG:', err.message);
} finally {
  await sql.end();
}
