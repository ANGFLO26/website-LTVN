import { describe, it, expect, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import type { ExecutionContext } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard.js';
import { resolveTrustProxy } from '../../common/proxy.util.js';

describe('F11 trusted client IP for rate limiting', () => {
  it('defaults to direct-socket mode and rejects blanket or hop-count trust', () => {
    expect(resolveTrustProxy(undefined)).toBe(false);
    expect(resolveTrustProxy('false')).toBe(false);
    expect(resolveTrustProxy('loopback')).toEqual(['loopback']);
    expect(resolveTrustProxy('10.0.0.2, 2001:db8::/32')).toEqual(['10.0.0.2', '2001:db8::/32']);
    expect(() => resolveTrustProxy('true')).toThrow();
    expect(() => resolveTrustProxy('1')).toThrow();
    expect(() => resolveTrustProxy('0.0.0.0/0')).toThrow();
  });
  function fixture(ip: string, forwarded?: string) {
    const enforce = vi.fn().mockResolvedValue({ maxRequests: 5, remaining: 4 });
    const guard = new RateLimitGuard(
      { getAllAndOverride: () => ({ scope: 'auth:login' }) } as any,
      { enforce } as any,
      new ConfigService({ NODE_ENV: 'test', RATE_LIMIT_ENABLED: 'true' }),
    );
    const req = {
      ip,
      headers: forwarded ? { 'x-forwarded-for': forwarded } : {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const res = { setHeader: vi.fn() };
    const context = {
      getHandler: () => null,
      getClass: () => null,
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    } as unknown as ExecutionContext;
    return { guard, context, enforce };
  }

  it('uses the Express socket IP for a direct connection despite forged forwarding headers', async () => {
    const { guard, context, enforce } = fixture('127.0.0.1', '198.51.100.1, 203.0.113.9');
    await guard.canActivate(context);
    expect(enforce).toHaveBeenCalledWith('auth:login', '127.0.0.1', undefined, undefined);
  });

  it('uses Express-resolved IP from a trusted proxy, not the last forwarded entry', async () => {
    const { guard, context, enforce } = fixture('198.51.100.25', '198.51.100.25, 10.0.0.5');
    await guard.canActivate(context);
    expect(enforce).toHaveBeenCalledWith('auth:login', '198.51.100.25', undefined, undefined);
  });
});
