import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RedirectsService } from './redirects.service.js';
import { CreateRedirectDto } from './dto/create-redirect.dto.js';
import { UpdateRedirectDto } from './dto/update-redirect.dto.js';

@ApiTags('Admin Redirects')
@ApiBearerAuth()
@Controller('redirects')
export class RedirectsController {
  constructor(private readonly redirectsService: RedirectsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all 301 redirects (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of all redirects' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll() {
    return this.redirectsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single redirect by UUID' })
  @ApiResponse({ status: 200, description: 'Redirect details' })
  @ApiResponse({ status: 404, description: 'Redirect not found' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.redirectsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new 301 redirect mapping' })
  @ApiResponse({ status: 201, description: 'Redirect created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid path, loop, or reserved route' })
  @ApiResponse({ status: 409, description: 'Duplicate source path' })
  async create(@Body() dto: CreateRedirectDto) {
    return this.redirectsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update existing redirect mapping' })
  @ApiResponse({ status: 200, description: 'Redirect updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid path, loop, or reserved route' })
  @ApiResponse({ status: 404, description: 'Redirect not found' })
  @ApiResponse({ status: 409, description: 'Duplicate source path' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateRedirectDto
  ) {
    return this.redirectsService.update(id, dto);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle active status of a redirect' })
  @ApiResponse({ status: 200, description: 'Redirect active status toggled' })
  @ApiResponse({ status: 400, description: 'Loop detected when enabling' })
  @ApiResponse({ status: 404, description: 'Redirect not found' })
  async toggle(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.redirectsService.toggle(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a redirect mapping' })
  @ApiResponse({ status: 200, description: 'Redirect deleted successfully' })
  @ApiResponse({ status: 404, description: 'Redirect not found' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.redirectsService.remove(id);
  }
}
