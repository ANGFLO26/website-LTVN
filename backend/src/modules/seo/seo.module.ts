import { Module } from '@nestjs/common';
import { SeoController } from './seo.controller.js';
import { SeoService } from './seo.service.js';
import { SeoHtmlController } from './seo-html.controller.js';
import { SeoHtmlService } from './seo-html.service.js';
import { SEO_REPOSITORY, DrizzleSeoRepository } from './seo.repository.js';

@Module({
  controllers: [SeoController, SeoHtmlController],
  providers: [
    SeoService,
    SeoHtmlService,
    {
      provide: SEO_REPOSITORY,
      useClass: DrizzleSeoRepository,
    },
  ],
  exports: [SeoService, SeoHtmlService, SEO_REPOSITORY],
})
export class SeoModule {}
