import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface.js';

export const DEFAULT_DEVELOPMENT_ORIGINS: readonly string[] = [
  'http://localhost:5173', // Main website Vite dev
  'http://localhost:5174', // Admin portal Vite dev
  'http://localhost:4173', // Main website Vite preview
  'http://localhost:3000', // Local API / Swagger UI
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:3000',
];

export const ALLOWED_CORS_METHODS: readonly string[] = [
  'GET',
  'HEAD',
  'PUT',
  'PATCH',
  'POST',
  'DELETE',
  'OPTIONS',
];

export const ALLOWED_CORS_HEADERS: readonly string[] = [
  'Content-Type',
  'Authorization',
  'Accept',
  'X-Requested-With',
];

export const EXPOSED_CORS_HEADERS: readonly string[] = [
  'Content-Range',
  'X-Content-Range',
];

/**
 * Validates that an origin string strictly follows `scheme://host[:port]`
 * with no path, query, hash fragment, or trailing slash.
 */
export function validateOrigin(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('CORS origin entry cannot be empty');
  }

  if (trimmed === '*' || trimmed === 'null') {
    throw new Error(`Wildcard or null CORS origins are not permitted in production: "${trimmed}"`);
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`Malformed CORS origin URL: "${trimmed}"`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Invalid CORS origin protocol "${url.protocol}": must be http or https ("${trimmed}")`);
  }

  if (url.username || url.password) {
    throw new Error(`CORS origin cannot contain credentials: "${trimmed}"`);
  }

  if (url.pathname !== '' && url.pathname !== '/') {
    throw new Error(`CORS origin cannot contain path: "${trimmed}"`);
  }

  if (trimmed.endsWith('/')) {
    throw new Error(`CORS origin cannot end with a trailing slash: "${trimmed}"`);
  }

  if (url.search) {
    throw new Error(`CORS origin cannot contain query parameters: "${trimmed}"`);
  }

  if (url.hash) {
    throw new Error(`CORS origin cannot contain hash fragment: "${trimmed}"`);
  }

  return url.origin.toLowerCase();
}

/**
 * Parses and validates comma-separated CORS_ALLOWED_ORIGINS environment variable.
 * Fails fast in production if missing, empty, or containing invalid entries.
 */
export function parseAllowedOrigins(
  rawOrigins?: string | null,
  nodeEnv?: string | null,
): string[] {
  const isProduction = nodeEnv?.trim().toLowerCase() === 'production';
  const hasValue = typeof rawOrigins === 'string' && rawOrigins.trim().length > 0;

  if (isProduction) {
    if (!hasValue) {
      throw new Error(
        'CORS_ALLOWED_ORIGINS environment variable is required and must contain explicit allowed origins in production'
      );
    }
  }

  if (!hasValue) {
    return [...DEFAULT_DEVELOPMENT_ORIGINS];
  }

  const entries = rawOrigins!.split(',');
  const parsedOrigins: string[] = [];

  for (const entry of entries) {
    const trimmed = entry.trim();
    if (!trimmed) {
      throw new Error(
        `CORS_ALLOWED_ORIGINS contains an empty or whitespace entry: "${rawOrigins}"`
      );
    }
    const validated = validateOrigin(trimmed);
    if (!parsedOrigins.includes(validated)) {
      parsedOrigins.push(validated);
    }
  }

  if (parsedOrigins.length === 0) {
    if (isProduction) {
      throw new Error(
        'CORS_ALLOWED_ORIGINS environment variable must contain at least one valid origin in production'
      );
    }
    return [...DEFAULT_DEVELOPMENT_ORIGINS];
  }

  return parsedOrigins;
}

/**
 * Checks whether an incoming request Origin is allowed.
 * - Non-browser requests (no Origin header) are allowed (returns true).
 * - Matches against allowed origins using exact Set membership.
 */
export function isOriginAllowed(
  requestOrigin: string | undefined | null,
  allowedOrigins: readonly string[],
): boolean {
  if (!requestOrigin) {
    return true;
  }

  let normalized: string;
  try {
    normalized = new URL(requestOrigin).origin.toLowerCase();
  } catch {
    normalized = requestOrigin.trim().toLowerCase();
  }

  return allowedOrigins.some((allowed) => allowed.toLowerCase() === normalized);
}

export interface CorsConfigAccessor {
  get?: (key: string) => unknown;
}

/**
 * Resolves full CorsOptions for NestJS app.enableCors() based on environment configuration.
 */
export function resolveCorsOptions(config?: CorsConfigAccessor): CorsOptions {
  const rawOrigins =
    (config?.get?.('CORS_ALLOWED_ORIGINS') as string | undefined) ??
    process.env.CORS_ALLOWED_ORIGINS;
  const rawEnv =
    (config?.get?.('NODE_ENV') as string | undefined) ?? process.env.NODE_ENV;

  const allowedOrigins = parseAllowedOrigins(rawOrigins, rawEnv);
  const allowedSet = new Set(allowedOrigins.map((o) => o.toLowerCase()));

  return {
    origin: (requestOrigin, callback) => {
      // Non-browser / server-to-server / curl requests have no Origin header
      if (!requestOrigin) {
        return callback(null, true);
      }

      let normalized: string;
      try {
        normalized = new URL(requestOrigin).origin.toLowerCase();
      } catch {
        normalized = requestOrigin.trim().toLowerCase();
      }

      if (allowedSet.has(normalized)) {
        return callback(null, true);
      }

      // Disallowed origin: do not set Access-Control-Allow-Origin header
      return callback(null, false);
    },
    methods: [...ALLOWED_CORS_METHODS],
    allowedHeaders: [...ALLOWED_CORS_HEADERS],
    exposedHeaders: [...EXPOSED_CORS_HEADERS],
    credentials: false,
    maxAge: 86400,
    optionsSuccessStatus: 204,
  };
}
