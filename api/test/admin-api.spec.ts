import { beforeEach, describe, expect, it, vi } from 'vitest';

const adminFetch = vi.hoisted(() => vi.fn());
vi.mock('../../admin/src/services/auth.ts', () => ({ adminFetch }));

// Dynamic path keeps this browser-client regression outside the Nest source root
// while Vitest still loads the real admin API module at runtime.
const adminApiPath = new URL('../../admin/src/services/api.ts', import.meta.url).href;
const { api } = await import(/* @vite-ignore */ adminApiPath);

const readers = [
  ['machines', () => api.getMachines()],
  ['standards', () => api.getStandards()],
  ['media', () => api.getMedia()],
  ['news', () => api.getNewsEvents()],
  ['contacts', () => api.getContacts()],
  ['users', () => api.getUsers()],
  ['redirects', () => api.getRedirects()],
] as const;

describe('admin API reads use authoritative backend responses', () => {
  beforeEach(() => adminFetch.mockReset());

  it.each(readers)('%s: HTTP 401 propagates without demo data', async (_name, read) => {
    adminFetch.mockResolvedValue(new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 }));
    await expect(read()).rejects.toMatchObject({ status: 401 });
  });

  it.each(readers)('%s: HTTP 500 propagates without demo data', async (_name, read) => {
    adminFetch.mockResolvedValue(new Response(JSON.stringify({ message: 'Server error' }), { status: 500 }));
    await expect(read()).rejects.toMatchObject({ status: 500 });
  });

  it.each(readers)('%s: network error response propagates without local fallback', async (_name, read) => {
    adminFetch.mockResolvedValue(Response.error());
    await expect(read()).rejects.toMatchObject({ status: 0 });
  });

  it.each(readers)('%s: empty successful response remains empty', async (_name, read) => {
    adminFetch.mockResolvedValue(new Response('[]', { status: 200 }));
    await expect(read()).resolves.toEqual([]);
  });

  it.each(readers)('%s: HTTP 204 and blank 200 lists render as empty', async (_name, read) => {
    adminFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(read()).resolves.toEqual([]);
    adminFetch.mockResolvedValueOnce(new Response('', { status: 200 }));
    await expect(read()).resolves.toEqual([]);
  });

  it.each(readers)('%s: successful response returns live records', async (_name, read) => {
    const record = { id: 'live-record' };
    adminFetch.mockResolvedValue(new Response(JSON.stringify([record]), { status: 200 }));
    await expect(read()).resolves.toEqual([record]);
  });

  it.each(readers)('%s: malformed list is an error, not a fake empty response', async (_name, read) => {
    adminFetch.mockResolvedValueOnce(new Response('{invalid', { status: 200 }));
    await expect(read()).rejects.toMatchObject({ status: 502 });
    adminFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    await expect(read()).rejects.toMatchObject({ status: 502 });
  });
});
