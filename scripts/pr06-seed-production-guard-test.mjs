import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import {
  assertSeedAllowed,
  getNodeEnv,
  isDirectExecution,
  seed,
} from '../api/dist/database/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== START PR-06 TARGETED VERIFICATION ===\n');

let passCount = 0;

function runCase(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passCount++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    throw err;
  }
}

async function runAsyncCase(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passCount++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    throw err;
  }
}

// Case A: NODE_ENV=production -> BLOCK
runCase('Case A: NODE_ENV=production throws fail-fast error', () => {
  assert.throws(
    () => assertSeedAllowed('production'),
    (err) => {
      assert.equal(err instanceof Error, true);
      assert.equal(err.message, 'Seed is disabled in production');
      return true;
    }
  );
});

// Case B: Production with whitespace / uppercase normalization -> BLOCK
runCase('Case B1: NODE_ENV="  Production  " with whitespace/casing throws fail-fast error', () => {
  assert.throws(
    () => assertSeedAllowed('  Production  '),
    (err) => {
      assert.equal(err.message, 'Seed is disabled in production');
      return true;
    }
  );
});

runCase('Case B2: NODE_ENV="PRODUCTION" uppercase throws fail-fast error', () => {
  assert.throws(
    () => assertSeedAllowed('PRODUCTION'),
    (err) => {
      assert.equal(err.message, 'Seed is disabled in production');
      return true;
    }
  );
});

// Case C: NODE_ENV=development -> ALLOW
runCase('Case C: NODE_ENV=development is allowed', () => {
  assert.doesNotThrow(() => assertSeedAllowed('development'));
});

// Case D: NODE_ENV=test -> ALLOW
runCase('Case D: NODE_ENV=test is allowed', () => {
  assert.doesNotThrow(() => assertSeedAllowed('test'));
});

// Case E: NODE_ENV=undefined -> ALLOW (local development workflow compatibility)
runCase('Case E: NODE_ENV=undefined is allowed for local dev compatibility', () => {
  assert.doesNotThrow(() => assertSeedAllowed(undefined));
});

// Case F: Verify isDirectExecution returns false when imported
runCase('Case F: isDirectExecution returns false when imported as a library', () => {
  assert.equal(isDirectExecution(), false);
});

// Case G: Programmatic seed() invocation fail-before-connect proof
await runAsyncCase('Case G: Fail-before-connect - programmatic seed() throws before DB connection', async () => {
  const originalEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    await assert.rejects(
      async () => {
        await seed();
      },
      (err) => {
        assert.equal(err instanceof Error, true);
        assert.equal(err.message, 'Seed is disabled in production');
        return true;
      }
    );
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
});

// Case H: CLI invocation fail-before-connect proof via sub-process
runCase('Case H: CLI invocation exits with code 1 and blocks before DB connection', () => {
  const seedScriptPath = resolve(__dirname, '../api/dist/database/seed.js');
  const result = spawnSync(process.execPath, [seedScriptPath], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
    },
    encoding: 'utf-8',
  });

  assert.equal(result.status, 1, 'Process must exit with non-zero code 1');
  assert.ok(
    result.stderr.includes('Seed is disabled in production'),
    `Stderr must indicate seed is disabled: ${result.stderr}`
  );
  assert.ok(
    !result.stdout.includes('Dọn dẹp dữ liệu cũ'),
    'Must NOT start deleting data'
  );
  assert.ok(
    !result.stdout.includes('NẠP TOÀN BỘ 100% DỮ LIỆU THÀNH CÔNG'),
    'Must NOT reach success log'
  );
});

console.log(`\n=== ALL ${passCount} PR-06 TARGETED TESTS PASSED ===`);
