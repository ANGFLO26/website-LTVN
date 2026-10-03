// Vite values are embedded at build time. Public-site and API destinations are independent.
const API_PATH = '/api';

function httpBase(value: string): URL | undefined {
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) return undefined;
    url.pathname = url.pathname.replace(/\/+$/, '') + '/';
    return url;
  } catch {
    return undefined;
  }
}

export function getPublicSiteUrl(): string | undefined {
  const configured = import.meta.env.VITE_PUBLIC_SITE_URL?.trim();
  if (configured) return httpBase(configured)?.href;
  // Development convenience only. Missing production config disables public links.
  return import.meta.env.DEV ? 'http://localhost:5173/' : undefined;
}

export function buildPublicUrl(path: string): string | undefined {
  const base = getPublicSiteUrl();
  return base ? new URL(path.replace(/^\/+/, ''), base).href : undefined;
}

export function getApiBaseUrl(): string | undefined {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  // Existing Admin contract: /api is proxied on the Admin origin in dev and production.
  if (!configured) return API_PATH;
  const url = httpBase(configured);
  if (!url) return undefined;
  // A bare configured origin uses the backend's verified /api prefix.
  if (url.pathname === '/') url.pathname = API_PATH;
  return url.href.replace(/\/+$/, '');
}

export function buildApiUrl(endpoint: string): string | undefined {
  const base = getApiBaseUrl();
  if (!base || (endpoint !== API_PATH && !endpoint.startsWith(API_PATH + '/'))) return undefined;
  const root = new URL(base, window.location.origin);
  const suffix = endpoint.slice(API_PATH.length).replace(/^\/+/, '');
  return suffix ? new URL(suffix, root.href + '/').href : root.href;
}

export function getSwaggerUrl(): string | undefined {
  // api/src/main.ts mounts Swagger at api/docs, under the same API base as requests.
  return buildApiUrl('/api/docs');
}
