import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SEO_REPOSITORY,
  type ISeoRepository,
} from './seo.repository.js';

export const STATIC_PUBLIC_ROUTES: readonly string[] = [
  '/',
  '/gioi-thieu',
  '/pac',
  '/tin-tuc-su-kien',
  '/lien-he',
];

/**
 * Escapes special XML characters for safe inclusion in sitemap XML.
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Formats a Date or date string to ISO 8601 YYYY-MM-DD for sitemap <lastmod>.
 * Returns undefined if date is missing or invalid.
 */
export function formatLastmod(date?: Date | string | null): string | undefined {
  if (!date) return undefined;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString().split('T')[0];
}

/**
 * Validates and normalizes the public website origin URL for SEO discovery.
 * - Production: requires explicit valid http/https origin, no path, query or hash.
 * - Development: defaults to http://localhost:5173 if unset.
 */
export function validatePublicSiteUrl(
  rawUrl?: string | null,
  nodeEnv?: string | null,
): string {
  const isProduction = nodeEnv?.trim().toLowerCase() === 'production';
  const trimmed = rawUrl?.trim();

  if (isProduction && !trimmed) {
    throw new Error('PUBLIC_SITE_URL environment variable is required in production');
  }

  if (!trimmed) {
    return 'http://localhost:5173';
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`Malformed PUBLIC_SITE_URL: "${trimmed}"`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(
      `Invalid PUBLIC_SITE_URL protocol "${url.protocol}": must be http or https ("${trimmed}")`,
    );
  }

  if (url.username || url.password) {
    throw new Error(`PUBLIC_SITE_URL cannot contain credentials: "${trimmed}"`);
  }

  if (url.search) {
    throw new Error(`PUBLIC_SITE_URL cannot contain query parameters: "${trimmed}"`);
  }

  if (url.hash) {
    throw new Error(`PUBLIC_SITE_URL cannot contain hash fragment: "${trimmed}"`);
  }

  if (url.pathname !== '' && url.pathname !== '/') {
    throw new Error(`PUBLIC_SITE_URL cannot contain path: "${trimmed}"`);
  }

  return url.origin;
}

export interface SitemapUrlEntry {
  loc: string;
  lastmod?: string;
}

@Injectable()
export class SeoService implements OnModuleInit {
  private readonly logger = new Logger(SeoService.name);

  constructor(
    @Inject(SEO_REPOSITORY) private readonly seoRepository: ISeoRepository,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    // Eagerly validate PUBLIC_SITE_URL on application bootstrap before listening
    this.getSiteUrl();
  }

  public getSiteUrl(): string {
    const rawUrl = this.configService.get<string>('PUBLIC_SITE_URL') ?? process.env.PUBLIC_SITE_URL;
    const rawEnv = this.configService.get<string>('NODE_ENV') ?? process.env.NODE_ENV;
    return validatePublicSiteUrl(rawUrl, rawEnv);
  }

  public getRobotsTxt(): string {
    const siteUrl = this.getSiteUrl();
    return [
      'User-agent: *',
      'Allow: /',
      '',
      `Sitemap: ${siteUrl}/sitemap.xml`,
    ].join('\n') + '\n';
  }

  public async getSitemapXml(): Promise<string> {
    const siteUrl = this.getSiteUrl();
    const seenUrls = new Set<string>();
    const entries: SitemapUrlEntry[] = [];

    const addEntry = (path: string, lastmodDate?: Date | string | null) => {
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      const absoluteLoc = normalizedPath === '/' ? `${siteUrl}/` : `${siteUrl}${normalizedPath}`;
      if (seenUrls.has(absoluteLoc)) {
        return;
      }
      seenUrls.add(absoluteLoc);
      const lastmod = formatLastmod(lastmodDate);
      entries.push({ loc: absoluteLoc, lastmod });
    };

    // 1. Static public routes
    for (const staticPath of STATIC_PUBLIC_ROUTES) {
      addEntry(staticPath);
    }

    // 2. Published machines / products
    try {
      const publishedMachines = await this.seoRepository.findAllPublishedMachinesForSitemap();
      for (const machine of publishedMachines) {
        if (machine.slug && machine.slug.trim()) {
          addEntry(
            `/san-pham/${machine.slug.trim()}`,
            machine.updatedAt || machine.publishedAt,
          );
        }
      }
    } catch (err) {
      this.logger.error('Failed to query machines for sitemap', (err as Error).stack);
    }

    // 3. Published news / events
    try {
      const publishedNews = await this.seoRepository.findAllPublishedNewsForSitemap();
      for (const item of publishedNews) {
        // Vietnamese entry
        if (item.slug && item.slug.trim()) {
          addEntry(`/tin-tuc/${item.slug.trim()}`, item.updatedAt || item.publishedAt);
        }

        // English entry: ONLY included when an authored English translation exists
        const enTranslation = item.translations?.find((t) => t.locale === 'en');
        if (enTranslation && enTranslation.slug && enTranslation.slug.trim()) {
          addEntry(
            `/tin-tuc/${enTranslation.slug.trim()}`,
            enTranslation.updatedAt || item.updatedAt || item.publishedAt,
          );
        }
      }
    } catch (err) {
      this.logger.error('Failed to query news events for sitemap', (err as Error).stack);
    }

    // Generate XML output
    const xmlLines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ];

    for (const entry of entries) {
      xmlLines.push('  <url>');
      xmlLines.push(`    <loc>${escapeXml(entry.loc)}</loc>`);
      if (entry.lastmod) {
        xmlLines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
      }
      xmlLines.push('  </url>');
    }

    xmlLines.push('</urlset>');
    return xmlLines.join('\n') + '\n';
  }
}
