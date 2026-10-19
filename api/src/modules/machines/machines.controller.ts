import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MachinesService } from './machines.service.js';
import type { CreateMachineDto, UpdateMachineDto } from './dto/machine-mutation.dto.js';
import { Public } from '../auth/public.decorator.js';

@ApiTags('Machines')
@Controller('machines')
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get published PAC machines with full relations' })
  @ApiResponse({ status: 200, description: 'List of machines with specs, applications, highlights' })
  findAll() {
    return this.machinesService.findPublished();
  }

  @Get(':idOrSlug')
  @Public()
  @ApiOperation({ summary: 'Get a published machine by UUID or URL slug' })
  @ApiResponse({ status: 404, description: 'Machine is not published or does not exist' })
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.machinesService.findPublishedByIdOrSlug(idOrSlug);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new PAC machine with optional sub-specs' })
  create(@Body() data: CreateMachineDto) {
    return this.machinesService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a PAC machine and sub-specs' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() data: UpdateMachineDto) {
    return this.machinesService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a PAC machine (Cascades child tables)' })
  delete(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.machinesService.delete(id);
  }
}
