import { randomBytes, randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { DRIZZLE } from '../src/database/database.module.js';
import { UsersService } from '../src/modules/users/users.service.js';
import { MachinesService } from '../src/modules/machines/machines.service.js';
import { NewsEventsService } from '../src/modules/news-events/news-events.service.js';
import { ContactsService } from '../src/modules/contacts/contacts.service.js';
import { RedirectsService } from '../src/modules/redirects/redirects.service.js';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

describe('PR-12: Unified 301 Redirect Management E2E', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;
  const adminId = randomUUID();
  const editorId = randomUUID();
  let adminToken: string;
  let editorToken: string;
  const jwtSecret = randomBytes(48).toString('base64url');

  // In-memory simulated database for redirects
  const mockRedirectsTable: Array<{
    id: string;
    sourcePath: string;
    destinationPath: string;
    statusCode: number;
    isActive: boolean;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  const mockUsers = [
    {
      id: adminId,
      email: 'admin@ltvietnam.com.vn',
      fullName: 'Quản Trị Viên',
      role: 'admin',
      status: 'active',
      deletedAt: null,
      tokenVersion: 0,
    },
    {
      id: editorId,
      email: 'editor@ltvietnam.com.vn',
      fullName: 'Biên Tập Viên',
      role: 'editor',
      status: 'active',
      deletedAt: null,
      tokenVersion: 0,
    },
  ];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService).useValue(new ConfigService({
        JWT_SECRET: jwtSecret,
        JWT_TTL_SECONDS: '3600',
        RATE_LIMIT_HASH_SECRET: 'test-hash-secret-pr12-min16chars',
        TURNSTILE_SECRET_KEY: 'test-turnstile-secret',
        NODE_ENV: 'test',
      }))
      .overrideProvider(DRIZZLE).useValue({
        query: {
          users: {
            findFirst: vi.fn().mockImplementation(async () => {
              // Extract ID from where condition
              return mockUsers.find((u) => u.role === 'admin');
            }),
          },
        },
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockImplementation(() => ({
            orderBy: vi.fn().mockResolvedValue([...mockRedirectsTable]),
            where: vi.fn().mockImplementation(() => ({
              limit: vi.fn().mockImplementation(async () => {
                return [];
              }),
            })),
          })),
        })),
      })
      .overrideProvider(UsersService).useValue({
        findAll: () => mockUsers,
        findOne: (id: string) => mockUsers.find((u) => u.id === id),
      })
      .overrideProvider(MachinesService).useValue({ findAll: () => [], findPublished: () => [] })
      .overrideProvider(NewsEventsService).useValue({ findAll: () => [], findPublished: () => [] })
      .overrideProvider(ContactsService).useValue({ findAll: () => [], create: vi.fn() })
      .compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api', {
      exclude: [
        'robots.txt',
        'sitemap.xml',
        'gioi-thieu',
        'pac',
        'tin-tuc-su-kien',
        'lien-he',
        'san-pham/:slug',
        'tin-tuc/:slug',
      ],
    });
    await app.init();

    jwt = module.get(JwtService);
    adminToken = await jwt.signAsync({ sub: adminId, tokenVersion: 0 });
    editorToken = await jwt.signAsync({ sub: editorId, tokenVersion: 0 });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Runtime HTTP 301 Evaluation (PR-12A)', () => {
    it('returns HTTP 301 and Location header for active redirect', async () => {
      const redirectsService = app.get(RedirectsService);
      vi.spyOn(redirectsService, 'resolve').mockImplementation(async (path: string) => {
        if (path === '/old-analyzer') {
          return { destinationPath: '/pac/optidist-2', statusCode: 301 };
        }
        return null;
      });

      const res = await request(app.getHttpServer())
        .get('/old-analyzer')
        .expect(301);

      expect(res.headers.location).toBe('/pac/optidist-2');
    });

    it('returns HTTP 301 for HEAD request with matching Location header', async () => {
      const res = await request(app.getHttpServer())
        .head('/old-analyzer')
        .expect(301);

      expect(res.headers.location).toBe('/pac/optidist-2');
    });

    it('preserves query parameters during 301 redirection', async () => {
      const res = await request(app.getHttpServer())
        .get('/old-analyzer?ref=email_campaign&utm_medium=cpc')
        .expect(301);

      expect(res.headers.location).toBe('/pac/optidist-2?ref=email_campaign&utm_medium=cpc');
    });

    it('allows /apiX mapping while bypassing encoded reserved API paths', async () => {
      const resolver = vi.spyOn(app.get(RedirectsService), 'resolve');
      resolver.mockImplementation(async (path: string) => path === '/apiX'
        ? { destinationPath: '/New', statusCode: 301 }
        : null);

      const mapped = await request(app.getHttpServer()).get('/apiX?from=legacy').expect(301);
      expect(mapped.headers.location).toBe('/New?from=legacy');
      resolver.mockClear();
      const protectedResponse = await request(app.getHttpServer()).get('/%61pi/users');
      expect(protectedResponse.status).not.toBe(301);
      expect(resolver).not.toHaveBeenCalled();
    });

    it('preserves case-sensitive slug lookup', async () => {
      const resolver = vi.spyOn(app.get(RedirectsService), 'resolve');
      resolver.mockImplementation(async (path: string) => path === '/OldSlug'
        ? { destinationPath: '/NewSlug', statusCode: 301 }
        : null);
      const exact = await request(app.getHttpServer()).get('/OldSlug').expect(301);
      expect(exact.headers.location).toBe('/NewSlug');
      const differentCase = await request(app.getHttpServer()).get('/oldslug');
      expect(differentCase.status).not.toBe(301);
    });

    it('returns a percent-encoded Unicode Location header', async () => {
      vi.spyOn(app.get(RedirectsService), 'resolve').mockImplementation(async (path: string) =>
        path === '/legacy-unicode' ? { destinationPath: '/Máy/cấu-hình', statusCode: 301 } : null);
      const response = await request(app.getHttpServer()).get('/legacy-unicode').expect(301);
      expect(response.headers.location).toBe('/M%C3%A1y/c%E1%BA%A5u-h%C3%ACnh');
    });

    it('does not redirect inactive or missing paths', async () => {
      const res = await request(app.getHttpServer())
        .get('/unknown-nonexistent-path-12345');

      expect(res.status).not.toBe(301);
    });

    it('never intercepts reserved endpoints (/robots.txt, /sitemap.xml, /api)', async () => {
      const robotsRes = await request(app.getHttpServer())
        .get('/robots.txt')
        .expect(200);

      expect(robotsRes.text).toContain('User-agent');

      const sitemapRes = await request(app.getHttpServer())
        .get('/sitemap.xml')
        .expect(200);

      expect(sitemapRes.text).toContain('urlset');
    });
  });

  describe('2. Admin Redirect CRUD & Authorization (PR-12B)', () => {
    it('rejects unauthenticated requests to /api/redirects with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/redirects')
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/redirects')
        .send({ sourcePath: '/old', destinationPath: '/new' })
        .expect(401);
    });

    it('rejects non-admin (editor) requests with 401 Unauthorized', async () => {
      const drizzle = app.get(DRIZZLE);
      // Mock findFirst returning editor
      (drizzle.query.users.findFirst as any).mockResolvedValueOnce(mockUsers[1]);

      await request(app.getHttpServer())
        .get('/api/redirects')
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(401);
    });

    it('allows Admin to list redirects with 200 OK', async () => {
      const drizzle = app.get(DRIZZLE);
      (drizzle.query.users.findFirst as any).mockResolvedValue(mockUsers[0]);

      const res = await request(app.getHttpServer())
        .get('/api/redirects')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('rejects open redirect and external URL destinations with 400 Bad Request', async () => {
      const drizzle = app.get(DRIZZLE);
      (drizzle.query.users.findFirst as any).mockResolvedValue(mockUsers[0]);

      // //evil.com
      await request(app.getHttpServer())
        .post('/api/redirects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sourcePath: '/old-link', destinationPath: '//evil.com' })
        .expect(400);

      // https://external.com
      await request(app.getHttpServer())
        .post('/api/redirects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sourcePath: '/old-link', destinationPath: 'https://attacker.org' })
        .expect(400);

      // javascript:
      await request(app.getHttpServer())
        .post('/api/redirects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sourcePath: '/old-link', destinationPath: 'javascript:alert(1)' })
        .expect(400);
    });

    it('rejects encoded separators, encoded reserved source, and destination query with 400', async () => {
      const drizzle = app.get(DRIZZLE);
      (drizzle.query.users.findFirst as any).mockResolvedValue(mockUsers[0]);
      for (const [sourcePath, destinationPath] of [
        ['/old-link', '/%2f%2fevil.com'],
        ['/%61pi/users', '/new-page'],
        ['/old-link', '/new-page?fixed=1'],
      ]) {
        await request(app.getHttpServer())
          .post('/api/redirects')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ sourcePath, destinationPath })
          .expect(400);
      }
    });

    it('rejects self-redirects with 400 Bad Request', async () => {
      const drizzle = app.get(DRIZZLE);
      (drizzle.query.users.findFirst as any).mockResolvedValue(mockUsers[0]);

      await request(app.getHttpServer())
        .post('/api/redirects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sourcePath: '/pac/optidist-2', destinationPath: '/pac/optidist-2' })
        .expect(400);
    });

    it('rejects redirects modifying reserved system routes with 400 Bad Request', async () => {
      const drizzle = app.get(DRIZZLE);
      (drizzle.query.users.findFirst as any).mockResolvedValue(mockUsers[0]);

      // Redirecting / (homepage)
      await request(app.getHttpServer())
        .post('/api/redirects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sourcePath: '/', destinationPath: '/new-home' })
        .expect(400);

      // Redirecting /api
      await request(app.getHttpServer())
        .post('/api/redirects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sourcePath: '/api/users', destinationPath: '/new-users' })
        .expect(400);

      // Redirecting /robots.txt
      await request(app.getHttpServer())
        .post('/api/redirects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sourcePath: '/robots.txt', destinationPath: '/my-robots' })
        .expect(400);
    });
  });
});
