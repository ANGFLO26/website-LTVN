import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { DRIZZLE } from '../src/database/database.module.js';
import { resolveCorsOptions } from '../src/common/cors.util.js';
import { SeoHtmlService } from '../src/modules/seo/seo-html.service.js';
import {
  SEO_REPOSITORY,
  type ISeoRepository,
  type SeoPublishedMachine,
  type SeoPublishedNews,
} from '../src/modules/seo/seo.repository.js';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('SEO Endpoints & HTML Shell E2E (PR-08A & PR-08B-V2)', () => {
  let app: INestApplication<App>;
  const publicSiteUrl = 'https://client.example.com';

  const mockMachines: SeoPublishedMachine[] = [
    {
      slug: 'optidist-2',
      model: 'PAC OptiDist 2',
      name: 'Thiết bị chưng cất tự động',
      shortDescription: 'Tự động xác định đường cong chưng cất.',
      status: 'published',
      deletedAt: null,
      updatedAt: new Date('2026-05-10T12:00:00Z'),
      publishedAt: new Date('2026-05-01T08:00:00Z'),
      mainImage: { publicUrl: '/images/products/optidist-2.png' },
    },
    {
      slug: 'cid-510',
      model: 'Herzog CID 510',
      name: 'Thiết bị xác định trị số cetane',
      status: 'published',
      deletedAt: null,
      updatedAt: new Date('2026-06-01T10:00:00Z'),
      publishedAt: new Date('2026-06-01T08:00:00Z'),
    },
    {
      slug: 'draft-machine',
      name: 'Draft machine',
      status: 'draft',
      deletedAt: null,
    },
  ];

  const mockNews: SeoPublishedNews[] = [
    {
      id: 'news-1',
      slug: 'ban-giao-pac-optidist-2',
      title: 'Bàn giao PAC OptiDist 2 tại Quatest 2',
      shortDescription: 'Hoàn thành lắp đặt và bàn giao thiết bị.',
      status: 'published',
      deletedAt: null,
      updatedAt: new Date('2026-06-01T08:00:00Z'),
      publishedAt: new Date('2026-06-01T08:00:00Z'),
      thumbnailImage: { publicUrl: '/images/brand/ltv-logo.png' },
      translations: [
        {
          locale: 'vi',
          slug: 'ban-giao-pac-optidist-2',
          title: 'Bàn giao PAC OptiDist 2 tại Quatest 2',
          shortDescription: 'Hoàn thành lắp đặt và bàn giao thiết bị.',
        },
        {
          locale: 'en',
          slug: 'handover-pac-optidist-2',
          title: 'Handover of PAC OptiDist 2 at Quatest 2',
          shortDescription: 'Completed installation and handover.',
        },
      ],
    },
    {
      id: 'news-2',
      slug: 'hoi-thao-van-an-toan',
      title: 'Hội thảo van an toàn',
      shortDescription: 'Hội thảo tại Hà Nội.',
      status: 'published',
      deletedAt: null,
      updatedAt: new Date('2026-07-01T10:00:00Z'),
      publishedAt: new Date('2026-07-01T10:00:00Z'),
      translations: [
        {
          locale: 'vi',
          slug: 'hoi-thao-van-an-toan',
          title: 'Hội thảo van an toàn',
          shortDescription: 'Hội thảo tại Hà Nội.',
        },
      ],
    },
    {
      id: 'news-draft',
      slug: 'draft-article',
      title: 'Draft article',
      status: 'draft',
      deletedAt: null,
    },
  ];

  class TestSeoRepository implements ISeoRepository {
    async findPublishedMachineBySlug(slug: string) {
      return mockMachines.find((m) => m.slug === slug && m.status === 'published' && !m.deletedAt) ?? null;
    }
    async findPublishedNewsBySlug(slug: string) {
      for (const item of mockNews.filter((record) => record.status === 'published' && !record.deletedAt)) {
        const en = item.translations?.find((t) => t.locale === 'en' && t.slug === slug);
        if (en) return { news: item, matchedTranslation: en, isEnglish: true };
        if (item.slug === slug) {
          const vi = item.translations?.find((t) => t.locale === 'vi');
          return { news: item, matchedTranslation: vi ?? null, isEnglish: false };
        }
      }
      return null;
    }
    async findAllPublishedMachinesForSitemap() {
      return mockMachines.filter((m) => m.status === 'published' && !m.deletedAt).map((m) => ({ slug: m.slug, updatedAt: m.updatedAt, publishedAt: m.publishedAt }));
    }
    async findAllPublishedNewsForSitemap() {
      return mockNews.filter((n) => n.status === 'published' && !n.deletedAt).map((n) => ({
        slug: n.slug,
        updatedAt: n.updatedAt,
        publishedAt: n.publishedAt,
        translations: n.translations,
      }));
    }
  }

  beforeEach(async () => {
    const configService = new ConfigService({
      JWT_SECRET: randomBytes(48).toString('base64url'),
      JWT_TTL_SECONDS: '3600',
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/ltvn_db',
      CORS_ALLOWED_ORIGINS: 'https://client.example.com',
      PUBLIC_SITE_URL: publicSiteUrl,
      RATE_LIMIT_HASH_SECRET: 'test-rate-limit-hash-secret-min16',
      TURNSTILE_SECRET_KEY: 'test-turnstile-secret-min16',
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService).useValue(configService)
      .overrideProvider(DRIZZLE).useValue({})
      .overrideProvider(SEO_REPOSITORY).useClass(TestSeoRepository)
      .compile();

    app = moduleFixture.createNestApplication();
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

    const seoHtmlService = app.get(SeoHtmlService);
    app.getHttpAdapter().get('/', async (_req: unknown, res: any) => {
      const html = await seoHtmlService.renderRouteHtml('/');
      res.setHeader('Content-Type', 'text/html; charset=UTF-8');
      res.send(html);
    });

    app.enableCors(resolveCorsOptions(configService));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /robots.txt serves plain text with Sitemap directive at root', async () => {
    const res = await request(app.getHttpServer()).get('/robots.txt').expect(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toContain('User-agent: *');
    expect(res.text).toContain('Allow: /');
    expect(res.text).toContain(`Sitemap: ${publicSiteUrl}/sitemap.xml`);
  });

  it('GET /sitemap.xml serves valid XML sitemap with static and dynamic published records', async () => {
    const res = await request(app.getHttpServer()).get('/sitemap.xml').expect(200);
    expect(res.headers['content-type']).toMatch(/xml/);
    expect(res.text).toContain('<loc>https://client.example.com/</loc>');
    expect(res.text).toContain('<loc>https://client.example.com/san-pham/optidist-2</loc>');
  });

  it('GET / serves initial HTML shell with dynamic Home metadata', async () => {
    const res = await request(app.getHttpServer()).get('/').expect(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('<title>Trang chủ | LT Việt Nam</title>');
    expect(res.text).toContain('<meta name="robots" content="index,follow" />');
    expect(res.text).toContain('<link rel="canonical" href="https://client.example.com/" />');
  });

  it('GET /san-pham/:slug serves initial HTML shell with dynamic product metadata', async () => {
    const res = await request(app.getHttpServer()).get('/san-pham/optidist-2').expect(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('<title>PAC OptiDist 2 | LT Việt Nam</title>');
    expect(res.text).toContain('<meta name="description" content="Tự động xác định đường cong chưng cất." />');
    expect(res.text).toContain('<link rel="canonical" href="https://client.example.com/san-pham/optidist-2" />');
    expect(res.text).toContain('<meta name="robots" content="index,follow" />');
  });

  it('GET /san-pham/:slug with missing or draft slug returns HTTP 404 and noindex,nofollow shell', async () => {
    for (const slug of ['not-real-machine', 'draft-machine']) {
      const res = await request(app.getHttpServer()).get(`/san-pham/${slug}`).expect(404);
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.text).toContain('<title>Không tìm thấy sản phẩm | LT Việt Nam</title>');
      expect(res.text).toContain('<meta name="robots" content="noindex,nofollow" />');
    }
  });

  it('GET /tin-tuc/:slug with missing or unpublished article returns HTTP 404', async () => {
    for (const slug of ['not-real-article', 'draft-article']) {
      const res = await request(app.getHttpServer()).get(`/tin-tuc/${slug}`).expect(404);
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.text).toContain('<meta name="robots" content="noindex,nofollow" />');
    }
  });

  it('GET /tin-tuc/:slug serves initial HTML shell with dynamic news metadata', async () => {
    // VI news
    const resVi = await request(app.getHttpServer()).get('/tin-tuc/ban-giao-pac-optidist-2').expect(200);
    expect(resVi.text).toContain('<title>Bàn giao PAC OptiDist 2 tại Quatest 2 | LT Việt Nam</title>');
    expect(resVi.text).toContain('<meta property="og:type" content="article" />');

    // EN news
    const resEn = await request(app.getHttpServer()).get('/tin-tuc/handover-pac-optidist-2').expect(200);
    expect(resEn.text).toContain('<title>Handover of PAC OptiDist 2 at Quatest 2 | LT Việt Nam</title>');
    expect(resEn.text).toContain('<meta property="og:locale" content="en_US" />');
  });

  it('Root discovery: /robots.txt and /sitemap.xml are served at root, while /api remains prefixed', async () => {
    await request(app.getHttpServer()).get('/robots.txt').expect(200);
    await request(app.getHttpServer()).get('/sitemap.xml').expect(200);
    await request(app.getHttpServer()).get('/api').expect(200).expect('Hello World!');
    await request(app.getHttpServer()).get('/api/robots.txt').expect(404);
  });
});
