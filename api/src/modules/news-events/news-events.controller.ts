import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { NewsEventsService } from './news-events.service.js';
import { Public } from '../auth/public.decorator.js';
import type { CreateNewsEventDto, UpdateNewsEventDto } from './dto/news-event-mutation.dto.js';

@ApiTags('News & Events')
@Controller('news-events')
export class NewsEventsController {
  constructor(private readonly newsEventsService: NewsEventsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get published news and events' })
  @ApiQuery({ name: 'locale', required: false, enum: ['vi', 'en'], description: 'Filter and project by locale' })
  @ApiResponse({ status: 200, description: 'List of articles and events' })
  findAll(@Query('locale') locale?: string) {
    return this.newsEventsService.findPublished(locale);
  }

  @Get(':idOrSlug')
  @Public()
  @ApiOperation({ summary: 'Get a published news/event by UUID or slug' })
  @ApiQuery({ name: 'locale', required: false, enum: ['vi', 'en'], description: 'Project by locale' })
  @ApiResponse({ status: 404, description: 'News/event is not published or does not exist' })
  findOne(@Param('idOrSlug') idOrSlug: string, @Query('locale') locale?: string) {
    return this.newsEventsService.findPublishedByIdOrSlug(idOrSlug, locale);
  }

  @Post()
  @ApiOperation({ summary: 'Create new news or event' })
  create(@Body() data: CreateNewsEventDto) {
    return this.newsEventsService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing news or event' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() data: UpdateNewsEventDto) {
    return this.newsEventsService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete news or event' })
  delete(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.newsEventsService.delete(id);
  }
}
