import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SeoService } from './seo.service.js';
import { Public } from '../auth/public.decorator.js';

@ApiTags('SEO')
@Controller()
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Get('robots.txt')
  @Public()
  @Header('Content-Type', 'text/plain; charset=UTF-8')
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({ summary: 'Robots.txt for web crawler directives' })
  @ApiResponse({ status: 200, description: 'Plain text robots.txt', type: String })
  getRobotsTxt(): string {
    return this.seoService.getRobotsTxt();
  }

  @Get('sitemap.xml')
  @Public()
  @Header('Content-Type', 'application/xml; charset=UTF-8')
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({ summary: 'Dynamic XML Sitemap for search engines' })
  @ApiResponse({ status: 200, description: 'XML sitemap format', type: String })
  async getSitemapXml(): Promise<string> {
    return this.seoService.getSitemapXml();
  }
}
