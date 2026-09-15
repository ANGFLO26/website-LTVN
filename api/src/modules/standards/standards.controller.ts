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
import { StandardsService } from './standards.service.js';
import type * as schema from '../../database/schema.js';

@ApiTags('Standards')
@Controller('standards')
export class StandardsController {
  constructor(private readonly standardsService: StandardsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all international standards' })
  @ApiResponse({ status: 200, description: 'List of standards' })
  findAll() {
    return this.standardsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single standard by ID' })
  findOne(@Param('id') id: string) {
    return this.standardsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new standard' })
  create(@Body() data: schema.NewStandard) {
    return this.standardsService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing standard' })
  update(@Param('id') id: string, @Body() data: Partial<schema.NewStandard>) {
    return this.standardsService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a standard' })
  delete(@Param('id') id: string) {
    return this.standardsService.delete(id);
  }
}
