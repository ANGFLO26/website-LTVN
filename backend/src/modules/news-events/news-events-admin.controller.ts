import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NewsEventsService } from './news-events.service.js';

@ApiTags('Admin News & Events')
@ApiBearerAuth()
@Controller('admin/news-events')
export class NewsEventsAdminController {
  constructor(private readonly newsEventsService: NewsEventsService) {}

  @Get()
  @ApiOperation({ summary: 'Get news/events in all statuses for Admin' })
  findAll() {
    return this.newsEventsService.findAll();
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get an Admin news/event by UUID or slug in any status' })
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.newsEventsService.findOne(idOrSlug);
  }
}
