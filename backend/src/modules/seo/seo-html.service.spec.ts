import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { SeoService } from './seo.service.js';
import {
  SeoHtmlService,
  escapeHtml,
  cleanText,
  injectMetadataIntoHtml,
  type RouteMetadata,
} from './seo-html.service.js';
import type {
  ISeoRepository,
  SeoPublishedMachine,
  SeoPublishedNews,
  SeoMatchedNewsResult,
} from './seo.repository.js';

class FakeSeoRepository implements ISeoRepository {
  constructor(
    public machines: SeoPublishedMachine[] = [],
    public news: SeoPublishedNews[] = [],
    public shouldFail = false,
  ) {}

  async findPublishedMachineBySlug(slug: string): Promise<SeoPublishedMachine | null> {
    if (this.shouldFail) {
      throw new Error('Simulated database failure for machine query');
    }
    const m = this.machines.find((x) => x.slug === slug);
    if (!m || m.status !== 'published' || m.deletedAt) {
      return null;
    }
    return m;
  }

  async findPublishedNewsBySlug(slug: string): Promise<SeoMatchedNewsResult | null> {
    if (this.shouldFail) {
      throw new Error('Simulated database failure for news query');
    }
    for (const item of this.news) {
      if (item.status !== 'published' || item.deletedAt) {
        continue;
      }
      const en = item.translations?.find((t) => t.locale === 'en' && t.slug === slug);
      if (en) {
        return { news: item, matchedTranslation: en, isEnglish: true };
      }
      if (item.slug === slug) {
        const vi = item.translations?.find((t) => t.locale === 'vi');
        return { news: item, matchedTranslation: vi ?? null, isEnglish: false };
      }
    }
    return null;
  }

  async findAllPublishedMachinesForSitemap(): Promise<
    Array<{ slug: string; updatedAt?: Date | null; publishedAt?: Date | null }>
  > {
    if (this.shouldFail) {
      throw new Error('Simulated database failure for sitemap');
    }
    return this.machines
      .filter((m) => m.status === 'published' && !m.deletedAt)
      .map((m) => ({ slug: m.slug, updatedAt: m.updatedAt, publishedAt: m.publishedAt }));
  }

  async findAllPublishedNewsForSitemap(): Promise<
    Array<{
      slug: string;
      updatedAt?: Date | null;
      publishedAt?: Date | null;
      translations?: Array<{
        locale: string;
        slug: string;
        updatedAt?: Date | null;
      }> | null;
    }>
  > {
    if (this.shouldFail) {
      throw new Error('Simulated database failure for sitemap');
    }
    return this.news
      .filter((n) => n.status === 'published' && !n.deletedAt)
      .map((n) => ({
        slug: n.slug,
        updatedAt: n.updatedAt,
        publishedAt: n.publishedAt,
        translations: n.translations,
      }));
  }
}

describe('SeoHtmlService & Failure Safety (PR-08B-V2 Unit Tests)', () => {
  const sampleTemplate = `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Old default description" />
    <meta property="og:title" content="Old Title" />
    <meta property="og:description" content="Old description" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="/images/brand/ltv-logo.png" />
    <title>Old Title</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

  describe('escapeHtml & cleanText', () => {
    it('escapes special characters for HTML attribute and text safety', () => {
      expect(escapeHtml('AT&T <test> "quote" \'single\'')).toBe(
        'AT&amp;T &lt;test&gt; &quot;quote&quot; &#39;single&#39;',
      );
    });

    it('cleans rich text and HTML markup from database strings', () => {
      expect(cleanText('<p>This is <strong>bold</strong> text.</p>')).toBe(
        'This is bold text.',
      );
      expect(cleanText('  Multi   space   ')).toBe('Multi space');
    });
  });

  describe('injectMetadataIntoHtml', () => {
    it('replaces template tags and guarantees exactly 1 of each tag with no duplicates', () => {
      const meta: RouteMetadata = {
        title: 'PAC OptiDist 2 & Test | LT Việt Nam',
        description: 'Thiết bị chưng cất <tự động> & an toàn "PAC"',
        canonical: 'https://client.example.com/san-pham/optidist-2',
        robots: 'index,follow',
        type: 'website',
        image: 'https://client.example.com/images/products/optidist-2.png',
        locale: 'vi_VN',
      };

      const result = injectMetadataIntoHtml(sampleTemplate, meta);

      // Title
      expect(result).toContain('<title>PAC OptiDist 2 &amp; Test | LT Việt Nam</title>');
      expect((result.match(/<title>/g) || []).length).toBe(1);

      // Description
      expect(result).toContain(
        '<meta name="description" content="Thiết bị chưng cất &lt;tự động&gt; &amp; an toàn &quot;PAC&quot;" />',
      );
      expect((result.match(/<meta\s+name=["']description["']/g) || []).length).toBe(1);

      // Robots
      expect(result).toContain('<meta name="robots" content="index,follow" />');
      expect((result.match(/<meta\s+name=["']robots["']/g) || []).length).toBe(1);

      // Canonical
      expect(result).toContain(
        '<link rel="canonical" href="https://client.example.com/san-pham/optidist-2" />',
      );
      expect((result.match(/<link\s+[^>]*rel=["']canonical["']/g) || []).length).toBe(1);

      // OG Tags
      expect(result).toContain(
        '<meta property="og:title" content="PAC OptiDist 2 &amp; Test | LT Việt Nam" />',
      );
      expect(result).toContain(
        '<meta property="og:url" content="https://client.example.com/san-pham/optidist-2" />',
      );
      expect(result).toContain(
        '<meta property="og:image" content="https://client.example.com/images/products/optidist-2.png" />',
      );
      expect((result.match(/<meta\s+property=["']og:title["']/g) || []).length).toBe(1);
      expect((result.match(/<meta\s+property=["']og:url["']/g) || []).length).toBe(1);
      expect((result.match(/<meta\s+property=["']og:image["']/g) || []).length).toBe(1);
    });
  });

  describe('SeoHtmlService routes rendering with FakeSeoRepository', () => {
    let service: SeoHtmlService;
    let repo: FakeSeoRepository;

    const sampleMachines: SeoPublishedMachine[] = [
      {
        slug: 'optidist-2',
        model: 'PAC OptiDist 2',
        name: 'Máy chưng cất tự động',
        shortDescription: 'Tự động xác định đường cong chưng cất.',
        status: 'published',
        deletedAt: null,
        mainImage: { publicUrl: '/images/products/optidist-2.png' },
      },
      {
        slug: 'draft-machine',
        model: 'Draft Model',
        name: 'Máy nháp chưa duyệt',
        shortDescription: 'Chưa được duyệt.',
        status: 'draft',
        deletedAt: null,
      },
      {
        slug: 'deleted-machine',
        model: 'Deleted Model',
        name: 'Máy đã xóa',
        status: 'published',
        deletedAt: new Date('2026-01-01'),
      },
    ];

    const sampleNews: SeoPublishedNews[] = [
      {
        id: 'news-1',
        slug: 'hoi-thao-van-an-toan',
        title: 'Hội thảo van an toàn',
        shortDescription: 'Chi tiết hội thảo van an toàn tại Hà Nội.',
        status: 'published',
        deletedAt: null,
        thumbnailImage: { publicUrl: '/images/brand/ltv-logo.png' },
        translations: [
          {
            locale: 'vi',
            slug: 'hoi-thao-van-an-toan',
            title: 'Hội thảo van an toàn',
            shortDescription: 'Chi tiết hội thảo van an toàn tại Hà Nội.',
          },
          {
            locale: 'en',
            slug: 'safety-valve-seminar',
            title: 'Safety Valve Seminar in Hanoi',
            shortDescription: 'Technical seminar in Hanoi.',
          },
        ],
      },
      {
        id: 'news-draft',
        slug: 'draft-news',
        title: 'Tin tức nháp',
        status: 'draft',
        deletedAt: null,
      },
    ];

    beforeEach(() => {
      repo = new FakeSeoRepository(sampleMachines, sampleNews, false);
      const configService = new ConfigService({
        PUBLIC_SITE_URL: 'https://client.example.com',
        NODE_ENV: 'production',
      });
      const seoService = new SeoService(repo, configService);
      service = new SeoHtmlService(repo, seoService);
      service.getTemplate = () => sampleTemplate;
    });

    it('renders static route / with home metadata', async () => {
      const html = await service.renderRouteHtml('/');
      expect(html).toContain('<title>Trang chủ | LT Việt Nam</title>');
      expect(html).toContain('<link rel="canonical" href="https://client.example.com/" />');
      expect(html).toContain('<meta name="robots" content="index,follow" />');
      expect(html).toContain('<meta property="og:type" content="website" />');
    });

    it('renders static route /gioi-thieu with about metadata', async () => {
      const html = await service.renderRouteHtml('/gioi-thieu');
      expect(html).toContain('<title>Giới thiệu | LT Việt Nam</title>');
      expect(html).toContain('<link rel="canonical" href="https://client.example.com/gioi-thieu" />');
    });

    it('renders published product route with dynamic metadata sourced from repository', async () => {
      const html = await service.renderProductHtml('optidist-2');
      expect(html).toContain('<title>PAC OptiDist 2 | LT Việt Nam</title>');
      expect(html).toContain(
        '<meta name="description" content="Tự động xác định đường cong chưng cất." />',
      );
      expect(html).toContain(
        '<link rel="canonical" href="https://client.example.com/san-pham/optidist-2" />',
      );
      expect(html).toContain('<meta name="robots" content="index,follow" />');
      expect(html).toContain(
        '<meta property="og:image" content="https://client.example.com/images/products/optidist-2.png" />',
      );
    });

    it('Requirement 6 & 7: renders 404 noindex for draft, deleted or nonexistent product', async () => {
      // Draft product
      const htmlDraft = await service.renderProductHtml('draft-machine');
      expect(htmlDraft).toContain('<title>Không tìm thấy sản phẩm | LT Việt Nam</title>');
      expect(htmlDraft).toContain('<meta name="robots" content="noindex,nofollow" />');

      // Deleted product
      const htmlDeleted = await service.renderProductHtml('deleted-machine');
      expect(htmlDeleted).toContain('<title>Không tìm thấy sản phẩm | LT Việt Nam</title>');
      expect(htmlDeleted).toContain('<meta name="robots" content="noindex,nofollow" />');

      // Nonexistent product
      const htmlNonexistent = await service.renderProductHtml('not-a-machine');
      expect(htmlNonexistent).toContain('<title>Không tìm thấy sản phẩm | LT Việt Nam</title>');
      expect(htmlNonexistent).toContain('<meta name="robots" content="noindex,nofollow" />');
    });

    it('Requirement 2 & 5: database failure returns Option B safe generic shell with noindex,nofollow (NO hardcoded fallback)', async () => {
      repo.shouldFail = true;

      const html = await service.renderProductHtml('optidist-2');
      // Must NOT contain OptiDist or indexable metadata!
      expect(html).toContain('<title>LT Việt Nam Technology Co., Ltd</title>');
      expect(html).toContain('<meta name="robots" content="noindex,nofollow" />');
      expect(html).toContain('<meta name="description" content="Hệ thống đang bảo trì dữ liệu sản phẩm." />');
      expect(html).not.toContain('PAC OptiDist 2');
      expect(html).not.toContain('index,follow');
    });

    it('renders published news in Vietnamese', async () => {
      const html = await service.renderArticleHtml('hoi-thao-van-an-toan');
      expect(html).toContain('<title>Hội thảo van an toàn | LT Việt Nam</title>');
      expect(html).toContain(
        '<link rel="canonical" href="https://client.example.com/tin-tuc/hoi-thao-van-an-toan" />',
      );
      expect(html).toContain('<meta name="robots" content="index,follow" />');
      expect(html).toContain('<meta property="og:type" content="article" />');
      expect(html).toContain('<meta property="og:locale" content="vi_VN" />');
    });

    it('Requirement 9: renders authored English translation with exact slug and en_US locale', async () => {
      const html = await service.renderArticleHtml('safety-valve-seminar');
      expect(html).toContain('<title>Safety Valve Seminar in Hanoi | LT Việt Nam</title>');
      expect(html).toContain(
        '<link rel="canonical" href="https://client.example.com/tin-tuc/safety-valve-seminar" />',
      );
      expect(html).toContain('<meta name="robots" content="index,follow" />');
      expect(html).toContain('<meta property="og:locale" content="en_US" />');
    });

    it('Requirement 2 & 5: news database failure returns Option B safe generic shell with noindex,nofollow (NO hardcoded fallback)', async () => {
      repo.shouldFail = true;

      const html = await service.renderArticleHtml('hoi-thao-van-an-toan');
      expect(html).toContain('<title>LT Việt Nam Technology Co., Ltd</title>');
      expect(html).toContain('<meta name="robots" content="noindex,nofollow" />');
      expect(html).toContain('<meta name="description" content="Hệ thống đang bảo trì dữ liệu bài viết." />');
      expect(html).not.toContain('Hội thảo van an toàn');
      expect(html).not.toContain('index,follow');
    });
  });
});
