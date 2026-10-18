import { Injectable, Inject, Logger } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
import { SeoService } from './seo.service.js';
import {
  SEO_REPOSITORY,
  type ISeoRepository,
} from './seo.repository.js';

export interface RouteMetadata {
  title: string;
  description: string;
  canonical: string;
  robots: 'index,follow' | 'noindex,nofollow';
  type: 'website' | 'article';
  image: string;
  locale: 'vi_VN' | 'en_US';
}

/**
 * Escapes characters for safe inclusion in HTML text and attributes.
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Strips HTML tags, collapses whitespace, and trims text.
 */
export function cleanText(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Locates the built frontend dist/index.html template file.
 */
export function resolveHtmlTemplatePath(): string {
  if (process.env.FRONTEND_DIST_DIR) {
    const custom = path.resolve(process.env.FRONTEND_DIST_DIR, 'index.html');
    if (fs.existsSync(custom)) return custom;
  }

  const candidates = [
    path.resolve(process.cwd(), '../dist/index.html'),
    path.resolve(process.cwd(), 'dist/index.html'),
    path.resolve(process.cwd(), '../../dist/index.html'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    'Frontend template dist/index.html not found. Please build the frontend first via npm run build.',
  );
}

/**
 * Injects or replaces metadata in the <head> of the HTML template,
 * guaranteeing exactly one instance of each tag with no duplicates.
 */
export function injectMetadataIntoHtml(
  templateHtml: string,
  meta: RouteMetadata,
): string {
  let html = templateHtml;

  const escapedTitle = escapeHtml(meta.title);
  const escapedDesc = escapeHtml(meta.description);
  const escapedRobots = escapeHtml(meta.robots);
  const escapedCanonical = escapeHtml(meta.canonical);
  const escapedType = escapeHtml(meta.type);
  const escapedImage = escapeHtml(meta.image);
  const escapedLocale = escapeHtml(meta.locale);

  // 1. <title>
  if (/<title>[^<]*<\/title>/i.test(html)) {
    html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapedTitle}</title>`);
  } else {
    html = html.replace('</head>', `  <title>${escapedTitle}</title>\n</head>`);
  }

  // 2. <meta name="description">
  if (/<meta\s+name=["']description["'][^>]*>/i.test(html)) {
    html = html.replace(
      /<meta\s+name=["']description["'][^>]*>/i,
      `<meta name="description" content="${escapedDesc}" />`,
    );
  } else {
    html = html.replace('</head>', `  <meta name="description" content="${escapedDesc}" />\n</head>`);
  }

  // 3. <meta name="robots">
  if (/<meta\s+name=["']robots["'][^>]*>/i.test(html)) {
    html = html.replace(
      /<meta\s+name=["']robots["'][^>]*>/i,
      `<meta name="robots" content="${escapedRobots}" />`,
    );
  } else {
    html = html.replace('</head>', `  <meta name="robots" content="${escapedRobots}" />\n</head>`);
  }

  // 4. <link rel="canonical">
  if (/<link\s+[^>]*rel=["']canonical["'][^>]*>/i.test(html)) {
    html = html.replace(
      /<link\s+[^>]*rel=["']canonical["'][^>]*>/i,
      `<link rel="canonical" href="${escapedCanonical}" />`,
    );
  } else {
    html = html.replace('</head>', `  <link rel="canonical" href="${escapedCanonical}" />\n</head>`);
  }

  // Helper for Open Graph meta replacement
  const replaceOrInsertMeta = (prop: string, content: string) => {
    const regex = new RegExp(`<meta\\s+property=["']${prop}["'][^>]*>`, 'i');
    if (regex.test(html)) {
      html = html.replace(regex, `<meta property="${prop}" content="${content}" />`);
    } else {
      html = html.replace('</head>', `  <meta property="${prop}" content="${content}" />\n</head>`);
    }
  };

  // Helper for name-based meta replacement (Twitter)
  const replaceOrInsertNameMeta = (name: string, content: string) => {
    const regex = new RegExp(`<meta\\s+name=["']${name}["'][^>]*>`, 'i');
    if (regex.test(html)) {
      html = html.replace(regex, `<meta name="${name}" content="${content}" />`);
    } else {
      html = html.replace('</head>', `  <meta name="${name}" content="${content}" />\n</head>`);
    }
  };

  // 5. Open Graph tags
  replaceOrInsertMeta('og:title', escapedTitle);
  replaceOrInsertMeta('og:description', escapedDesc);
  replaceOrInsertMeta('og:url', escapedCanonical);
  replaceOrInsertMeta('og:type', escapedType);
  replaceOrInsertMeta('og:image', escapedImage);
  replaceOrInsertMeta('og:locale', escapedLocale);

  // 6. Twitter Card tags
  replaceOrInsertNameMeta('twitter:card', 'summary_large_image');
  replaceOrInsertNameMeta('twitter:title', escapedTitle);
  replaceOrInsertNameMeta('twitter:description', escapedDesc);
  replaceOrInsertNameMeta('twitter:image', escapedImage);

  return html;
}

@Injectable()
export class SeoHtmlService {
  private readonly logger = new Logger(SeoHtmlService.name);
  private cachedTemplate: string | null = null;

  constructor(
    @Inject(SEO_REPOSITORY) private readonly seoRepository: ISeoRepository,
    private readonly seoService: SeoService,
  ) {}

  public getTemplate(): string {
    if (this.cachedTemplate && process.env.NODE_ENV === 'production') {
      return this.cachedTemplate;
    }
    const templatePath = resolveHtmlTemplatePath();
    const content = fs.readFileSync(templatePath, 'utf8');
    if (process.env.NODE_ENV === 'production') {
      this.cachedTemplate = content;
    }
    return content;
  }

  private toAbsoluteUrl(imagePath?: string | null): string {
    const origin = this.seoService.getSiteUrl();
    const fallback = `${origin}/images/brand/ltv-logo.png`;
    if (!imagePath || !imagePath.trim()) return fallback;
    const trimmed = imagePath.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${origin}${normalized}`;
  }

  public async renderRouteHtml(pathname: string): Promise<string> {
    const siteUrl = this.seoService.getSiteUrl();
    const template = this.getTemplate();
    const fallbackImage = `${siteUrl}/images/brand/ltv-logo.png`;

    let meta: RouteMetadata;

    switch (pathname) {
      case '/':
        meta = {
          title: 'Trang chủ | LT Việt Nam',
          description:
            'LT Việt Nam cung cấp thiết bị phân tích PAC, van điều khiển Masoneilan, van an toàn Consolidated và dịch vụ kỹ thuật.',
          canonical: `${siteUrl}/`,
          robots: 'index,follow',
          type: 'website',
          image: fallbackImage,
          locale: 'vi_VN',
        };
        break;

      case '/gioi-thieu':
        meta = {
          title: 'Giới thiệu | LT Việt Nam',
          description:
            'LT Việt Nam là đối tác phân phối và cung cấp dịch vụ kỹ thuật cho thiết bị phân tích PAC và các dòng van công nghiệp.',
          canonical: `${siteUrl}/gioi-thieu`,
          robots: 'index,follow',
          type: 'website',
          image: fallbackImage,
          locale: 'vi_VN',
        };
        break;

      case '/pac':
        meta = {
          title: 'PAC | LT Việt Nam',
          description:
            'Danh mục thiết bị phân tích PAC chính hãng: chưng cất, điểm đông đặc, điểm chớp cháy và trị số cetane.',
          canonical: `${siteUrl}/pac`,
          robots: 'index,follow',
          type: 'website',
          image: fallbackImage,
          locale: 'vi_VN',
        };
        break;

      case '/tin-tuc-su-kien':
        meta = {
          title: 'Tin tức & sự kiện | LT Việt Nam',
          description:
            'Cập nhật tin tức hoạt động, dự án chuyển giao công nghệ và sự kiện hội thảo kỹ thuật của LT Việt Nam.',
          canonical: `${siteUrl}/tin-tuc-su-kien`,
          robots: 'index,follow',
          type: 'website',
          image: fallbackImage,
          locale: 'vi_VN',
        };
        break;

      case '/lien-he':
        meta = {
          title: 'Liên hệ | LT Việt Nam',
          description:
            'Liên hệ LT Việt Nam để nhận tư vấn kỹ thuật, báo giá thiết bị phân tích PAC và van công nghiệp.',
          canonical: `${siteUrl}/lien-he`,
          robots: 'index,follow',
          type: 'website',
          image: fallbackImage,
          locale: 'vi_VN',
        };
        break;

      default:
        meta = {
          title: 'Không tìm thấy trang | LT Việt Nam',
          description: 'Trang bạn yêu cầu không tồn tại hoặc đã được chuyển hướng.',
          canonical: `${siteUrl}${pathname.startsWith('/') ? pathname : `/${pathname}`}`,
          robots: 'noindex,nofollow',
          type: 'website',
          image: fallbackImage,
          locale: 'vi_VN',
        };
        break;
    }

    return injectMetadataIntoHtml(template, meta);
  }

  public async renderProductHtml(slug: string): Promise<string> {
    return (await this.renderProductResponse(slug)).html;
  }

  public async renderProductResponse(slug: string): Promise<{ html: string; status: 200 | 404 | 503 }> {
    const siteUrl = this.seoService.getSiteUrl();
    const template = this.getTemplate();
    const fallbackImage = `${siteUrl}/images/brand/ltv-logo.png`;

    try {
      const machine = await this.seoRepository.findPublishedMachineBySlug(slug);

      if (machine) {
        const modelTitle = cleanText(machine.model || machine.name);
        const rawDesc = cleanText(
          machine.shortDescription || machine.description || machine.name,
        );
        const meta: RouteMetadata = {
          title: `${modelTitle} | LT Việt Nam`,
          description: rawDesc,
          canonical: `${siteUrl}/san-pham/${machine.slug}`,
          robots: 'index,follow',
          type: 'website',
          image: this.toAbsoluteUrl(machine.mainImage?.publicUrl),
          locale: 'vi_VN',
        };
        return { html: injectMetadataIntoHtml(template, meta), status: 200 };
      }
    } catch (err) {
      this.logger.error(`Database failure resolving product metadata for slug: ${slug}`, (err as Error).stack);
      // Option B: Database failure returns safe generic noindex shell (NO hardcoded product resurrection)
      const dbErrorMeta: RouteMetadata = {
        title: 'LT Việt Nam Technology Co., Ltd',
        description: 'Hệ thống đang bảo trì dữ liệu sản phẩm.',
        canonical: `${siteUrl}/san-pham/${slug}`,
        robots: 'noindex,nofollow',
        type: 'website',
        image: fallbackImage,
        locale: 'vi_VN',
      };
      return { html: injectMetadataIntoHtml(template, dbErrorMeta), status: 503 };
    }

    // Product not found or unpublished: noindex,nofollow
    const notFoundMeta: RouteMetadata = {
      title: 'Không tìm thấy sản phẩm | LT Việt Nam',
      description: 'Sản phẩm bạn đang tìm kiếm không tồn tại hoặc đã được cập nhật.',
      canonical: `${siteUrl}/san-pham/${slug}`,
      robots: 'noindex,nofollow',
      type: 'website',
      image: fallbackImage,
      locale: 'vi_VN',
    };
    return { html: injectMetadataIntoHtml(template, notFoundMeta), status: 404 };
  }

  public async renderArticleHtml(slug: string): Promise<string> {
    return (await this.renderArticleResponse(slug)).html;
  }

  public async renderArticleResponse(slug: string): Promise<{ html: string; status: 200 | 404 | 503 }> {
    const siteUrl = this.seoService.getSiteUrl();
    const template = this.getTemplate();
    const fallbackImage = `${siteUrl}/images/brand/ltv-logo.png`;

    try {
      const result = await this.seoRepository.findPublishedNewsBySlug(slug);

      if (result) {
        const { news, matchedTranslation, isEnglish } = result;
        const title = cleanText(matchedTranslation?.title || news.title);
        const desc = cleanText(
          matchedTranslation?.shortDescription ||
            matchedTranslation?.seoDescription ||
            news.shortDescription ||
            news.title,
        );
        const canonicalSlug = matchedTranslation?.slug || news.slug;
        const meta: RouteMetadata = {
          title: `${title} | LT Việt Nam`,
          description: desc,
          canonical: `${siteUrl}/tin-tuc/${canonicalSlug}`,
          robots: 'index,follow',
          type: 'article',
          image: this.toAbsoluteUrl(news.thumbnailImage?.publicUrl),
          locale: isEnglish ? 'en_US' : 'vi_VN',
        };
        return { html: injectMetadataIntoHtml(template, meta), status: 200 };
      }
    } catch (err) {
      this.logger.error(`Database failure resolving article metadata for slug: ${slug}`, (err as Error).stack);
      // Option B: Database failure returns safe generic noindex shell (NO hardcoded news resurrection)
      const dbErrorMeta: RouteMetadata = {
        title: 'LT Việt Nam Technology Co., Ltd',
        description: 'Hệ thống đang bảo trì dữ liệu bài viết.',
        canonical: `${siteUrl}/tin-tuc/${slug}`,
        robots: 'noindex,nofollow',
        type: 'website',
        image: fallbackImage,
        locale: 'vi_VN',
      };
      return { html: injectMetadataIntoHtml(template, dbErrorMeta), status: 503 };
    }

    // Article not found or unpublished: noindex,nofollow
    const notFoundMeta: RouteMetadata = {
      title: 'Không tìm thấy bài viết | LT Việt Nam',
      description: 'Bài viết bạn đang tìm kiếm không tồn tại hoặc đã được gỡ bỏ.',
      canonical: `${siteUrl}/tin-tuc/${slug}`,
      robots: 'noindex,nofollow',
      type: 'website',
      image: fallbackImage,
      locale: 'vi_VN',
    };
    return { html: injectMetadataIntoHtml(template, notFoundMeta), status: 404 };
  }
}
