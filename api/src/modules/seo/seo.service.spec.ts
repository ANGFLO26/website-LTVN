import { describe, it, expect } from 'vitest';
import { ConfigService } from '@nestjs/config';
import {
  SeoService,
  validatePublicSiteUrl,
  escapeXml,
  formatLastmod,
  STATIC_PUBLIC_ROUTES,
} from './seo.service.js';
import type { ISeoRepository } from './seo.repository.js';

describe('SeoService & Helpers (PR-08A Unit Tests)', () => {
  describe('Helper: escapeXml', () => {
    it('escapes &, <, >, ", and \'', () => {
      expect(escapeXml('https://example.com/item?a=1&b=2<test>"quote\'')).toBe(
        'https://example.com/item?a=1&amp;b=2&lt;test&gt;&quot;quote&apos;',
      );
      expect(escapeXml('https://example.com/simple-url')).toBe('https://example.com/simple-url');
    });
  });

  describe('Helper: formatLastmod', () => {
    it('formats Date or ISO string into YYYY-MM-DD', () => {
      const d = new Date('2026-06-15T08:30:00Z');
      expect(formatLastmod(d)).toBe('2026-06-15');
      expect(formatLastmod('2026-06-15T08:30:00Z')).toBe('2026-06-15');
    });

    it('returns undefined if date is missing or invalid', () => {
      expect(formatLastmod(undefined)).toBeUndefined();
      expect(formatLastmod(null)).toBeUndefined();
      expect(formatLastmod('invalid-date')).toBeUndefined();
    });
  });

  describe('Helper: validatePublicSiteUrl', () => {
    it('normalizes valid production origin and strips trailing slash', () => {
      expect(validatePublicSiteUrl('https://example.com', 'production')).toBe('https://example.com');
      expect(validatePublicSiteUrl('https://example.com/', 'production')).toBe('https://example.com');
      expect(validatePublicSiteUrl('https://sub.example.com:8443/', 'production')).toBe(
        'https://sub.example.com:8443',
      );
    });

    it('defaults to http://localhost:5173 in development when unset', () => {
      expect(validatePublicSiteUrl(undefined, 'development')).toBe('http://localhost:5173');
      expect(validatePublicSiteUrl('', 'development')).toBe('http://localhost:5173');
      expect(validatePublicSiteUrl('   ', undefined)).toBe('http://localhost:5173');
    });

    it('throws error in production when PUBLIC_SITE_URL is missing or empty', () => {
      expect(() => validatePublicSiteUrl(undefined, 'production')).toThrow(
        /PUBLIC_SITE_URL environment variable is required in production/,
      );
      expect(() => validatePublicSiteUrl('', 'production')).toThrow(
        /PUBLIC_SITE_URL environment variable is required in production/,
      );
      expect(() => validatePublicSiteUrl('   ', 'production')).toThrow(
        /PUBLIC_SITE_URL environment variable is required in production/,
      );
    });

    it('rejects invalid protocols (ftp, javascript) and malformed URLs', () => {
      expect(() => validatePublicSiteUrl('ftp://example.com', 'production')).toThrow(
        /Invalid PUBLIC_SITE_URL protocol/,
      );
      expect(() => validatePublicSiteUrl('not-a-url', 'production')).toThrow(
        /Malformed PUBLIC_SITE_URL/,
      );
    });

    it('rejects URLs containing query parameters, hash fragments, or paths', () => {
      expect(() => validatePublicSiteUrl('https://example.com?query=1', 'production')).toThrow(
        /PUBLIC_SITE_URL cannot contain query parameters/,
      );
      expect(() => validatePublicSiteUrl('https://example.com#section', 'production')).toThrow(
        /PUBLIC_SITE_URL cannot contain hash fragment/,
      );
      expect(() => validatePublicSiteUrl('https://example.com/path', 'production')).toThrow(
        /PUBLIC_SITE_URL cannot contain path/,
      );
    });

    it('eagerly validates PUBLIC_SITE_URL onModuleInit', () => {
      const failingConfig = new ConfigService({
        NODE_ENV: 'production',
        PUBLIC_SITE_URL: 'https://example.com/path',
      });
      const dummyRepo: ISeoRepository = {
        findPublishedMachineBySlug: async () => null,
        findPublishedNewsBySlug: async () => null,
        findAllPublishedMachinesForSitemap: async () => [],
        findAllPublishedNewsForSitemap: async () => [],
      };
      const service = new SeoService(dummyRepo, failingConfig);
      expect(() => service.onModuleInit()).toThrow(/PUBLIC_SITE_URL cannot contain path/);
    });
  });

  describe('SeoService.getRobotsTxt()', () => {
    it('produces valid robots.txt with User-agent, Allow, and absolute Sitemap URL', () => {
      const configService = new ConfigService({
        PUBLIC_SITE_URL: 'https://ltvietnam.example.com',
        NODE_ENV: 'production',
      });
      const dummyRepo: ISeoRepository = {
        findPublishedMachineBySlug: async () => null,
        findPublishedNewsBySlug: async () => null,
        findAllPublishedMachinesForSitemap: async () => [],
        findAllPublishedNewsForSitemap: async () => [],
      };
      const service = new SeoService(dummyRepo, configService);

      const robots = service.getRobotsTxt();

      expect(robots).toContain('User-agent: *');
      expect(robots).toContain('Allow: /');
      expect(robots).toContain('Sitemap: https://ltvietnam.example.com/sitemap.xml');
      // Must not advertise internal admin or api routes
      expect(robots).not.toContain('/admin');
      expect(robots).not.toContain('/api');
      expect(robots).not.toContain('/login');
    });
  });

  describe('SeoService.getSitemapXml()', () => {
    const mockRepo: ISeoRepository = {
      findPublishedMachineBySlug: async () => null,
      findPublishedNewsBySlug: async () => null,
      findAllPublishedMachinesForSitemap: async () => [
        {
          slug: 'optidist-2',
          updatedAt: new Date('2026-05-10T12:00:00Z'),
          publishedAt: new Date('2026-05-01T08:00:00Z'),
        },
        {
          slug: 'cid-510',
          updatedAt: new Date('2026-06-01T10:00:00Z'),
          publishedAt: null,
        },
      ],
      findAllPublishedNewsForSitemap: async () => [
        {
          slug: 'ban-giao-pac-optidist-2',
          updatedAt: new Date('2026-06-01T08:00:00Z'),
          publishedAt: new Date('2026-06-01T08:00:00Z'),
          translations: [
            { locale: 'vi', slug: 'ban-giao-pac-optidist-2', updatedAt: new Date('2026-06-01T08:00:00Z') },
            { locale: 'en', slug: 'handover-pac-optidist-2', updatedAt: new Date('2026-06-02T09:00:00Z') },
          ],
        },
        {
          slug: 'hoi-thao-van-an-toan',
          updatedAt: new Date('2026-07-01T10:00:00Z'),
          publishedAt: new Date('2026-07-01T10:00:00Z'),
          translations: [
            { locale: 'vi', slug: 'hoi-thao-van-an-toan', updatedAt: new Date('2026-07-01T10:00:00Z') },
          ],
        },
      ],
    };

    it('generates valid sitemap XML including static routes, published products, and news', async () => {
      const configService = new ConfigService({
        PUBLIC_SITE_URL: 'https://ltvietnam.example.com',
        NODE_ENV: 'production',
      });
      const service = new SeoService(mockRepo, configService);

      const xml = await service.getSitemapXml();

      // Header and XML structure
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(xml).toContain('</urlset>');

      // Static routes
      for (const route of STATIC_PUBLIC_ROUTES) {
        const expectedLoc = route === '/' ? 'https://ltvietnam.example.com/' : `https://ltvietnam.example.com${route}`;
        expect(xml).toContain(`<loc>${expectedLoc}</loc>`);
      }

      // Products (machines)
      expect(xml).toContain('<loc>https://ltvietnam.example.com/san-pham/optidist-2</loc>');
      expect(xml).toContain('<loc>https://ltvietnam.example.com/san-pham/cid-510</loc>');

      // News with both VI and EN translations
      expect(xml).toContain('<loc>https://ltvietnam.example.com/tin-tuc/ban-giao-pac-optidist-2</loc>');
      expect(xml).toContain('<loc>https://ltvietnam.example.com/tin-tuc/handover-pac-optidist-2</loc>');

      // VI-only news
      expect(xml).toContain('<loc>https://ltvietnam.example.com/tin-tuc/hoi-thao-van-an-toan</loc>');

      // Must NOT include fake EN url for VI-only news
      expect(xml).not.toContain('hoi-thao-van-an-toan-en');

      // Must not include commented out /baker-hughes or admin routes
      expect(xml).not.toContain('/baker-hughes');
      expect(xml).not.toContain('/admin');
      expect(xml).not.toContain('/api');

      // Verify no duplicate URLs
      const locMatches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
      const uniqueLocs = new Set(locMatches);
      expect(uniqueLocs.size).toBe(locMatches.length);

      // Verify all <loc> are absolute
      for (const loc of locMatches) {
        expect(loc.startsWith('https://ltvietnam.example.com')).toBe(true);
      }
    });

    it('gracefully handles database failure without malformed XML or crash', async () => {
      const failingRepo: ISeoRepository = {
        findPublishedMachineBySlug: async () => { throw new Error('Database connection failed'); },
        findPublishedNewsBySlug: async () => { throw new Error('Database connection failed'); },
        findAllPublishedMachinesForSitemap: async () => { throw new Error('Database connection failed'); },
        findAllPublishedNewsForSitemap: async () => { throw new Error('Database connection failed'); },
      };

      const configService = new ConfigService({
        PUBLIC_SITE_URL: 'https://ltvietnam.example.com',
        NODE_ENV: 'production',
      });
      const service = new SeoService(failingRepo, configService);

      const xml = await service.getSitemapXml();

      // Still returns valid XML with static routes
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(xml).toContain('<loc>https://ltvietnam.example.com/</loc>');
      expect(xml).toContain('</urlset>');
    });
  });
});
