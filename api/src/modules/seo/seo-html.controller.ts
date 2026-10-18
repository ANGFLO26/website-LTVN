import { Controller, Get, Param, Header, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SeoHtmlService } from './seo-html.service.js';
import { Public } from '../auth/public.decorator.js';

@ApiTags('Public Web')
@Controller()
export class SeoHtmlController {
  constructor(private readonly seoHtmlService: SeoHtmlService) {}

  @Get()
  @Public()
  @Header('Content-Type', 'text/html; charset=UTF-8')
  @ApiOperation({ summary: 'Home page HTML shell with dynamic metadata' })
  @ApiResponse({ status: 200, description: 'HTML document', type: String })
  async getHome(): Promise<string> {
    return this.seoHtmlService.renderRouteHtml('/');
  }

  @Get('gioi-thieu')
  @Public()
  @Header('Content-Type', 'text/html; charset=UTF-8')
  @ApiOperation({ summary: 'About page HTML shell with dynamic metadata' })
  @ApiResponse({ status: 200, description: 'HTML document', type: String })
  async getAbout(): Promise<string> {
    return this.seoHtmlService.renderRouteHtml('/gioi-thieu');
  }

  @Get('pac')
  @Public()
  @Header('Content-Type', 'text/html; charset=UTF-8')
  @ApiOperation({ summary: 'PAC Catalog page HTML shell with dynamic metadata' })
  @ApiResponse({ status: 200, description: 'HTML document', type: String })
  async getPac(): Promise<string> {
    return this.seoHtmlService.renderRouteHtml('/pac');
  }

  @Get('tin-tuc-su-kien')
  @Public()
  @Header('Content-Type', 'text/html; charset=UTF-8')
  @ApiOperation({ summary: 'News listing page HTML shell with dynamic metadata' })
  @ApiResponse({ status: 200, description: 'HTML document', type: String })
  async getNews(): Promise<string> {
    return this.seoHtmlService.renderRouteHtml('/tin-tuc-su-kien');
  }

  @Get('lien-he')
  @Public()
  @Header('Content-Type', 'text/html; charset=UTF-8')
  @ApiOperation({ summary: 'Contact page HTML shell with dynamic metadata' })
  @ApiResponse({ status: 200, description: 'HTML document', type: String })
  async getContact(): Promise<string> {
    return this.seoHtmlService.renderRouteHtml('/lien-he');
  }

  @Get('san-pham/:slug')
  @Public()
  @Header('Content-Type', 'text/html; charset=UTF-8')
  @ApiOperation({ summary: 'Product detail page HTML shell with dynamic metadata' })
  @ApiResponse({ status: 200, description: 'Published product HTML document', type: String })
  @ApiResponse({ status: 404, description: 'Product not found or unpublished', type: String })
  async getProduct(@Param('slug') slug: string, @Res({ passthrough: true }) response: Response): Promise<string> {
    const result = await this.seoHtmlService.renderProductResponse(slug);
    response.status(result.status);
    return result.html;
  }

  @Get('tin-tuc/:slug')
  @Public()
  @Header('Content-Type', 'text/html; charset=UTF-8')
  @ApiOperation({ summary: 'Article detail page HTML shell with dynamic metadata' })
  @ApiResponse({ status: 200, description: 'Published article HTML document', type: String })
  @ApiResponse({ status: 404, description: 'Article not found or unpublished', type: String })
  async getArticle(@Param('slug') slug: string, @Res({ passthrough: true }) response: Response): Promise<string> {
    const result = await this.seoHtmlService.renderArticleResponse(slug);
    response.status(result.status);
    return result.html;
  }
}
