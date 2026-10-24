import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  normalizeRedirectPath,
  isReservedPath,
  validateRedirectPaths,
  detectCycleOrLoop,
} from './redirects.util.js';
import { RedirectsService } from './redirects.service.js';
import { RedirectMiddleware } from './redirect.middleware.js';

describe('PR-12: Redirects Normalization & Validation Utility', () => {
  it('normalizes valid paths correctly', () => {
    expect(normalizeRedirectPath('/San-Pham/Optidist-2/')).toBe('/San-Pham/Optidist-2');
    expect(normalizeRedirectPath('/a//b///c')).toBe('/a/b/c');
    expect(normalizeRedirectPath('/c%E1%BA%A5u-h%C3%ACnh/')).toBe('/cấu-hình');
    expect(normalizeRedirectPath('/M%C3%A1y')).toBe('/Máy');
  });

  it('rejects invalid, control, and malicious inputs', () => {
    expect(() => normalizeRedirectPath('')).toThrow(BadRequestException);
    expect(() => normalizeRedirectPath('   ')).toThrow(BadRequestException);
    expect(() => normalizeRedirectPath('/path\x00with-null')).toThrow(BadRequestException);
    expect(() => normalizeRedirectPath('/path\\with\\backslash')).toThrow(BadRequestException);
    expect(() => normalizeRedirectPath('no-leading-slash')).toThrow(BadRequestException);
  });

  it('strictly blocks open redirect vectors', () => {
    expect(() => normalizeRedirectPath('//evil.com')).toThrow(BadRequestException);
    expect(() => normalizeRedirectPath('//attacker.org/steal')).toThrow(BadRequestException);
    expect(() => normalizeRedirectPath('https://evil.com')).toThrow(BadRequestException);
    expect(() => normalizeRedirectPath('http://evil.com/phish')).toThrow(BadRequestException);
    expect(() => normalizeRedirectPath('javascript:alert(1)')).toThrow(BadRequestException);
    expect(() => normalizeRedirectPath('data:text/html,<script>evil()</script>')).toThrow(BadRequestException);
    for (const value of ['/%2f%2fevil.com', '/%5cevil.com', '/abc%', '/%252f%252fevil.com']) {
      expect(() => normalizeRedirectPath(value)).toThrow(BadRequestException);
    }
    expect(() => normalizeRedirectPath('/old?x=1')).toThrow(BadRequestException);
    expect(() => normalizeRedirectPath('/old#fragment')).toThrow(BadRequestException);
    expect(() => normalizeRedirectPath('/old%00path')).toThrow(BadRequestException);
  });

  it('protects reserved system routes', () => {
    expect(isReservedPath('/')).toBe(true);
    expect(isReservedPath('/api')).toBe(true);
    expect(isReservedPath('/api/users')).toBe(true);
    expect(isReservedPath('/admin')).toBe(true);
    expect(isReservedPath('/admin/dashboard')).toBe(true);
    expect(isReservedPath('/robots.txt')).toBe(true);
    expect(isReservedPath('/sitemap.xml')).toBe(true);
    expect(isReservedPath('/assets/index.js')).toBe(true);
    expect(isReservedPath('/images/logo.png')).toBe(true);
    expect(isReservedPath('/favicon.ico')).toBe(true);
    expect(isReservedPath('/API/users')).toBe(true);
    expect(isReservedPath('/apiX')).toBe(false);

    expect(isReservedPath('/san-pham-cu')).toBe(false);
    expect(isReservedPath('/tin-tuc-cu')).toBe(false);
  });

  it('rejects self-redirect and reserved paths in validateRedirectPaths', () => {
    expect(() => validateRedirectPaths('/same', '/same')).toThrow(BadRequestException);
    expect(() => validateRedirectPaths('/api/data', '/new-page')).toThrow(BadRequestException);
    expect(() => validateRedirectPaths('/', '/new-home')).toThrow(BadRequestException);
    expect(() => validateRedirectPaths('/%61pi/users', '/new-page')).toThrow(BadRequestException);
    expect(() => validateRedirectPaths('/old', '/new?fixed=1')).toThrow(BadRequestException);
    expect(() => validateRedirectPaths('/old', '/robots.txt')).toThrow(BadRequestException);
    expect(validateRedirectPaths('/apiX/', '/New')).toEqual({ sourcePath: '/apiX', destinationPath: '/New' });
  });

  it('detects 2-node cycles, multi-node loops, and chains', () => {
    const existing = [
      { id: '1', sourcePath: '/a', destinationPath: '/b', isActive: true },
      { id: '2', sourcePath: '/x', destinationPath: '/y', isActive: true },
    ];

    // 2-node loop: trying to add /b -> /a
    expect(() => detectCycleOrLoop('/b', '/a', existing)).toThrow(/vòng lặp|chuỗi/);

    // Multi-node loop: /b -> /c -> /a
    const chain = [
      { id: '1', sourcePath: '/a', destinationPath: '/b', isActive: true },
      { id: '2', sourcePath: '/b', destinationPath: '/c', isActive: true },
    ];
    expect(() => detectCycleOrLoop('/c', '/a', chain)).toThrow(/vòng lặp|chuỗi/);

    // Chain prevention: adding /c -> /a where /a already redirects to /b
    expect(() => detectCycleOrLoop('/c', '/a', existing)).toThrow(/chuỗi chuyển hướng/);

    // Chain prevention: adding /b -> /c where /a already redirects to /b
    expect(() => detectCycleOrLoop('/b', '/c', existing)).toThrow(/chuỗi chuyển hướng/);

    // Valid independent redirect does not throw
    expect(() => detectCycleOrLoop('/fresh', '/target', existing)).not.toThrow();
  });
});

describe('PR-12: RedirectsService Logic', () => {
  let service: RedirectsService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    mockDb.transaction = vi.fn(async (callback: (tx: any) => Promise<unknown>) => callback({
      execute: vi.fn().mockResolvedValue(undefined),
      select: mockDb.select,
      insert: mockDb.insert,
      update: mockDb.update,
      delete: mockDb.delete,
    }));
    service = new RedirectsService(mockDb);
  });

  it('creates redirect and rejects duplicate sourcePath', async () => {
    // Mock existing check returning an existing item
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockResolvedValueOnce([{ id: 'existing-id' }]),
      }),
    });

    await expect(
      service.create({ sourcePath: '/old', destinationPath: '/new' })
    ).rejects.toThrow(ConflictException);
  });

  it('resolves active redirect and returns destination', async () => {
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockReturnValueOnce({
          limit: vi.fn().mockResolvedValueOnce([
            { destinationPath: '/pac/optidist-2', statusCode: 301, isActive: true },
          ]),
        }),
      }),
    });

    const res = await service.resolve('/old-product');
    expect(res).toEqual({ destinationPath: '/pac/optidist-2', statusCode: 301 });
  });

  it('returns null when no active redirect matches', async () => {
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockReturnValueOnce({
          limit: vi.fn().mockResolvedValueOnce([]),
        }),
      }),
    });

    const res = await service.resolve('/unmatched-url');
    expect(res).toBeNull();
  });
});

describe('PR-12: RedirectMiddleware Logic', () => {
  let middleware: RedirectMiddleware;
  let mockService: any;
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    mockService = {
      resolve: vi.fn(),
    };
    middleware = new RedirectMiddleware(mockService);
    req = { method: 'GET', path: '/old-link', originalUrl: '/old-link', headers: {} };
    res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      end: vi.fn(),
    };
    next = vi.fn();
  });

  it('bypasses API, Admin, and static routes', async () => {
    req.path = '/api/users';
    await middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(mockService.resolve).not.toHaveBeenCalled();

    req.path = '/robots.txt';
    await middleware.use(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);

    req.path = '/sitemap.xml';
    await middleware.use(req, res, next);
    expect(next).toHaveBeenCalledTimes(3);
  });

  it('uses the same reserved-path policy as validation, including encoded routes', async () => {
    req.path = '/%61pi/users';
    await middleware.use(req, res, next);
    expect(mockService.resolve).not.toHaveBeenCalled();

    req.path = '/apiX';
    mockService.resolve.mockResolvedValue(null);
    await middleware.use(req, res, next);
    expect(mockService.resolve).toHaveBeenCalledWith('/apiX');
  });

  it('bypasses non-GET / HEAD methods', async () => {
    req.method = 'POST';
    await middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(mockService.resolve).not.toHaveBeenCalled();
  });

  it('redirects matching paths with 301 and Location header', async () => {
    mockService.resolve.mockResolvedValueOnce({
      destinationPath: '/pac/new-machine',
      statusCode: 301,
    });

    await middleware.use(req, res, next);
    expect(res.setHeader).toHaveBeenCalledWith('Location', '/pac/new-machine');
    expect(res.status).toHaveBeenCalledWith(301);
    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('preserves query parameters during 301 redirection', async () => {
    req.path = '/old-link';
    req.originalUrl = '/old-link?utm_source=newsletter&campaign=pac2026';
    mockService.resolve.mockResolvedValueOnce({
      destinationPath: '/pac/new-machine',
      statusCode: 301,
    });

    await middleware.use(req, res, next);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Location',
      '/pac/new-machine?utm_source=newsletter&campaign=pac2026'
    );
    expect(res.status).toHaveBeenCalledWith(301);
  });

  it('encodes a Unicode destination path in the Location header', async () => {
    mockService.resolve.mockResolvedValueOnce({ destinationPath: '/Máy/cấu-hình', statusCode: 301 });
    await middleware.use(req, res, next);
    expect(res.setHeader).toHaveBeenCalledWith('Location', '/M%C3%A1y/c%E1%BA%A5u-h%C3%ACnh');
  });

  it('calls next() when no redirect exists', async () => {
    mockService.resolve.mockResolvedValueOnce(null);

    await middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
  });
});
