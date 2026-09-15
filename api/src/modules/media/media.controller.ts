import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MediaService } from './media.service.js';
import type * as schema from '../../database/schema.js';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @ApiOperation({ summary: 'Get all media assets' })
  @ApiResponse({ status: 200, description: 'List of media files' })
  findAll() {
    return this.mediaService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get media asset by ID' })
  findOne(@Param('id') id: string) {
    return this.mediaService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new media record' })
  create(@Body() data: schema.NewMediaAsset) {
    return this.mediaService.create(data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a media asset' })
  delete(@Param('id') id: string) {
    return this.mediaService.delete(id);
  }
}
