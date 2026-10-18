import { describe, it, expect } from 'vitest';
import {
  parseAllowedOrigins,
  validateOrigin,
  isOriginAllowed,
  resolveCorsOptions,
  DEFAULT_DEVELOPMENT_ORIGINS,
  ALLOWED_CORS_METHODS,
  ALLOWED_CORS_HEADERS,
  EXPOSED_CORS_HEADERS,
} from './cors.util.js';

describe('CORS Configuration & Origin Validation (PR-02)', () => {
  describe('Requirement 14.1 & 14.2: Production valid origins', () => {
    it('1. production valid one origin', () => {
      const origins = parseAllowedOrigins('https://example.com', 'production');
      expect(origins).toEqual(['https://example.com']);
    });

    it('2. production multiple origins', () => {
      const origins = parseAllowedOrigins(
        'https://www.example.com,https://admin.example.com',
        'production',
      );
      expect(origins).toEqual([
        'https://www.example.com',
        'https://admin.example.com',
      ]);
    });

    it('3. whitespace trimming', () => {
      const origins = parseAllowedOrigins(
        '  https://example.com  ,   https://admin.example.com  ',
        'production',
      );
      expect(origins).toEqual([
        'https://example.com',
        'https://admin.example.com',
      ]);
    });
  });

  describe('Requirement 14.4 & 14.5: Fail-closed production requirements', () => {
    it('4. missing production config -> fail', () => {
      expect(() => parseAllowedOrigins(undefined, 'production')).toThrow(
        /CORS_ALLOWED_ORIGINS environment variable is required/,
      );
      expect(() => parseAllowedOrigins(null, 'production')).toThrow(
        /CORS_ALLOWED_ORIGINS environment variable is required/,
      );
    });

    it('5. empty production config -> fail', () => {
      expect(() => parseAllowedOrigins('', 'production')).toThrow(
        /CORS_ALLOWED_ORIGINS environment variable is required/,
      );
      expect(() => parseAllowedOrigins('   ', 'production')).toThrow(
        /CORS_ALLOWED_ORIGINS environment variable is required/,
      );
      expect(() =>
        parseAllowedOrigins('https://example.com, ,https://admin.example.com', 'production'),
      ).toThrow(/empty or whitespace entry/);
    });
  });

  describe('Requirement 14.6, 14.7, 14.8: Origin format validation', () => {
    it('6. wildcard production -> fail', () => {
      expect(() => parseAllowedOrigins('*', 'production')).toThrow(
        /Wildcard or null CORS origins are not permitted in production/,
      );
      expect(() =>
        parseAllowedOrigins('https://example.com,*', 'production'),
      ).toThrow(/Wildcard or null CORS origins are not permitted in production/);
      expect(() => parseAllowedOrigins('null', 'production')).toThrow(
        /Wildcard or null CORS origins are not permitted in production/,
      );
    });

    it('7. malformed origin -> fail', () => {
      expect(() => validateOrigin('not-a-url')).toThrow(/Malformed CORS origin URL/);
      expect(() => validateOrigin('ftp://example.com')).toThrow(
        /Invalid CORS origin protocol "ftp:": must be http or https/,
      );
      expect(() => validateOrigin('javascript:alert(1)')).toThrow(
        /Invalid CORS origin protocol/,
      );
      expect(() => validateOrigin('user:pass@https://example.com')).toThrow();
    });

    it('8. path/query/hash -> fail', () => {
      // Path
      expect(() => validateOrigin('https://example.com/api')).toThrow(
        /CORS origin cannot contain path/,
      );
      expect(() => validateOrigin('https://example.com/')).toThrow(
        /CORS origin cannot end with a trailing slash/,
      );
      // Query
      expect(() => validateOrigin('https://example.com?foo=bar')).toThrow(
        /CORS origin cannot contain query parameters/,
      );
      // Hash
      expect(() => validateOrigin('https://example.com#section')).toThrow(
        /CORS origin cannot contain hash fragment/,
      );
    });
  });

  describe('Requirement 14.9, 14.10, 14.11: Origin matching & No-Origin policy', () => {
    const allowed = ['https://example.com', 'https://admin.example.com'];

    it('9. exact allowed origin accepted', () => {
      expect(isOriginAllowed('https://example.com', allowed)).toBe(true);
      expect(isOriginAllowed('https://admin.example.com', allowed)).toBe(true);
      // Case insensitive check
      expect(isOriginAllowed('HTTPS://EXAMPLE.COM', allowed)).toBe(true);
    });

    it('10. disallowed origin rejected', () => {
      expect(isOriginAllowed('https://evil.example.com', allowed)).toBe(false);
      expect(isOriginAllowed('https://example.com.evil.tld', allowed)).toBe(false);
      expect(isOriginAllowed('https://not-allowed.org', allowed)).toBe(false);
      expect(isOriginAllowed('http://example.com', allowed)).toBe(false); // wrong protocol
    });

    it('11. no-Origin request allowed', () => {
      // Server-to-server, curl, health checks
      expect(isOriginAllowed(undefined, allowed)).toBe(true);
      expect(isOriginAllowed(null, allowed)).toBe(true);
      expect(isOriginAllowed('', allowed)).toBe(true);
    });
  });

  describe('Requirement 14.12: Development environment defaults', () => {
    it('12. development defaults valid', () => {
      const devOrigins = parseAllowedOrigins(undefined, 'development');
      expect(devOrigins).toEqual(DEFAULT_DEVELOPMENT_ORIGINS);
      expect(devOrigins).toContain('http://localhost:5173');
      expect(devOrigins).toContain('http://localhost:5174');
      expect(devOrigins).toContain('http://localhost:4173');
      expect(devOrigins).toContain('http://localhost:3000');

      // Development can override when explicit origins are provided
      const customDev = parseAllowedOrigins(
        'http://localhost:8080,http://localhost:9000',
        'development',
      );
      expect(customDev).toEqual(['http://localhost:8080', 'http://localhost:9000']);
    });
  });

  describe('resolveCorsOptions integration contract', () => {
    it('produces valid CorsOptions with origin callback, methods, headers, and credentials: false', () => {
      const options = resolveCorsOptions({
        get: (key: string) => {
          if (key === 'NODE_ENV') return 'production';
          if (key === 'CORS_ALLOWED_ORIGINS') return 'https://client.example.com';
          return undefined;
        },
      });

      expect(options.credentials).toBe(false);
      expect(options.methods).toEqual(ALLOWED_CORS_METHODS);
      expect(options.allowedHeaders).toEqual(ALLOWED_CORS_HEADERS);
      expect(options.exposedHeaders).toEqual(EXPOSED_CORS_HEADERS);
      expect(options.maxAge).toBe(86400);
      expect(options.optionsSuccessStatus).toBe(204);

      // Verify origin callback behavior
      const originFn = options.origin as (
        origin: string | undefined,
        cb: (err: Error | null, allow?: boolean | string) => void,
      ) => void;

      // Allowed origin
      originFn('https://client.example.com', (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
      });

      // Disallowed origin
      originFn('https://evil.attacker.com', (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(false);
      });

      // No origin (curl / server-to-server)
      originFn(undefined, (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
      });
    });

    it('throws immediately on resolveCorsOptions if production has missing CORS_ALLOWED_ORIGINS', () => {
      expect(() =>
        resolveCorsOptions({
          get: (key: string) => (key === 'NODE_ENV' ? 'production' : undefined),
        }),
      ).toThrow(/CORS_ALLOWED_ORIGINS environment variable is required/);
    });
  });
});
