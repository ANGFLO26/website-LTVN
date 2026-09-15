import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NewsEventsService } from './news-events.service.js';
import type * as schema from '../../database/schema.js';

@ApiTags('News & Events')
@Controller('news-events')
export class NewsEventsController {
  constructor(private readonly newsEventsService: NewsEventsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all news and events' })
  @ApiResponse({ status: 200, description: 'List of articles and events' })
  findAll() {
    return this.newsEventsService.findAll();
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get single news/event by UUID or slug' })
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.newsEventsService.findOne(idOrSlug);
  }

  @Post()
  @ApiOperation({ summary: 'Create new news or event' })
  create(@Body() data: schema.NewNewsEvent) {
    return this.newsEventsService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing news or event' })
  update(@Param('id') id: string, @Body() data: Partial<schema.NewNewsEvent>) {
    return this.newsEventsService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete news or event' })
  delete(@Param('id') id: string) {
    return this.newsEventsService.delete(id);
  }
}
