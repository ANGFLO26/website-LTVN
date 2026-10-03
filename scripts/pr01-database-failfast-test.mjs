import assert from 'node:assert/strict';
import { resolveDatabaseUrl, DEFAULT_DEV_DATABASE_URL, DatabaseModule, DRIZZLE } from '../api/dist/database/database.module.js';

console.log('=== START PR-01 TARGETED VERIFICATION ===\n');

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

// Case A: Production with valid DATABASE_URL -> resolved configured URL
runCase('Case A: Production + valid DATABASE_URL resolves configured URL', () => {
  const dummyUrl = 'postgresql://test_user:test_secret@db.production.local:5432/test_db';
  const mockConfig = {
    get: (key) => {
      if (key === 'NODE_ENV') return 'production';
      if (key === 'DATABASE_URL') return dummyUrl;
      return undefined;
    },
  };

  const resolved = resolveDatabaseUrl(mockConfig);
  assert.equal(resolved, dummyUrl);
});

// Case B: Production with missing DATABASE_URL -> throws exact error
runCase('Case B: Production + missing DATABASE_URL throws fail-fast error', () => {
  const mockConfig = {
    get: (key) => {
      if (key === 'NODE_ENV') return 'production';
      if (key === 'DATABASE_URL') return undefined;
      return undefined;
    },
  };

  assert.throws(
    () => resolveDatabaseUrl(mockConfig),
    (err) => {
      assert.equal(err instanceof Error, true);
      assert.equal(err.message, 'DATABASE_URL environment variable is required in production');
      // Ensure error does not contain any connection string
      assert.equal(err.message.includes('postgresql://'), false);
      return true;
    }
  );
});

// Case C: Production with empty/whitespace DATABASE_URL -> throws exact error
runCase('Case C1: Production + whitespace DATABASE_URL throws fail-fast error', () => {
  const mockConfig = {
    get: (key) => {
      if (key === 'NODE_ENV') return 'production';
      if (key === 'DATABASE_URL') return '   ';
      return undefined;
    },
  };

  assert.throws(
    () => resolveDatabaseUrl(mockConfig),
    (err) => {
      assert.equal(err.message, 'DATABASE_URL environment variable is required in production');
      return true;
    }
  );
});

runCase('Case C2: Production + empty string DATABASE_URL throws fail-fast error', () => {
  const mockConfig = {
    get: (key) => {
      if (key === 'NODE_ENV') return 'production';
      if (key === 'DATABASE_URL') return '';
      return undefined;
    },
  };

  assert.throws(
    () => resolveDatabaseUrl(mockConfig),
    (err) => {
      assert.equal(err.message, 'DATABASE_URL environment variable is required in production');
      return true;
    }
  );
});

// Case D: Development/test with missing DATABASE_URL -> fallback to local development URL
runCase('Case D1: Development + missing DATABASE_URL falls back to local dev URL', () => {
  const mockConfig = {
    get: (key) => {
      if (key === 'NODE_ENV') return 'development';
      if (key === 'DATABASE_URL') return undefined;
      return undefined;
    },
  };

  const resolved = resolveDatabaseUrl(mockConfig);
  assert.equal(resolved, DEFAULT_DEV_DATABASE_URL);
  assert.equal(resolved, 'postgresql://postgres:postgres@localhost:5432/ltvn_db');
});

runCase('Case D2: Test env + missing DATABASE_URL falls back to local dev URL', () => {
  const mockConfig = {
    get: (key) => {
      if (key === 'NODE_ENV') return 'test';
      if (key === 'DATABASE_URL') return undefined;
      return undefined;
    },
  };

  const resolved = resolveDatabaseUrl(mockConfig);
  assert.equal(resolved, DEFAULT_DEV_DATABASE_URL);
});

// Case E: Process.env fallback behavior (without ConfigService)
runCase('Case E: Process.env resolution without ConfigService object', () => {
  const originalEnv = { ...process.env };
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.DATABASE_URL;
    assert.throws(
      () => resolveDatabaseUrl(),
      /DATABASE_URL environment variable is required in production/
    );

    process.env.NODE_ENV = 'development';
    delete process.env.DATABASE_URL;
    assert.equal(resolveDatabaseUrl(), DEFAULT_DEV_DATABASE_URL);
  } finally {
    process.env = originalEnv;
  }
});

// Case F: Fail-before-connect proof on DatabaseModule provider factory
runCase('Case F: Fail-before-connect proof - provider factory throws before client creation', () => {
  // Find the DRIZZLE provider from DatabaseModule
  // Note: DatabaseModule has providers metadata
  const provider = Reflect.getMetadata('providers', DatabaseModule)?.find(
    (p) => p.provide === DRIZZLE
  );
  assert.ok(provider, 'DRIZZLE provider must be registered on DatabaseModule');
  assert.equal(typeof provider.useFactory, 'function', 'Provider must define useFactory');

  const mockProdConfigMissingUrl = {
    get: (key) => {
      if (key === 'NODE_ENV') return 'production';
      if (key === 'DATABASE_URL') return undefined;
      return undefined;
    },
  };

  // Calling useFactory with production missing env must throw immediately
  assert.throws(
    () => provider.useFactory(mockProdConfigMissingUrl),
    (err) => {
      assert.equal(err.message, 'DATABASE_URL environment variable is required in production');
      return true;
    }
  );
});

console.log(`\n=== ALL ${passCount} PR-01 TARGETED TESTS PASSED ===`);
