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
import { MachinesService, type CreateMachineDto } from './machines.service.js';

@ApiTags('Machines')
@Controller('machines')
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all PAC machines with full relations' })
  @ApiResponse({ status: 200, description: 'List of machines with specs, applications, highlights' })
  findAll() {
    return this.machinesService.findAll();
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get a machine by UUID or URL slug' })
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.machinesService.findOne(idOrSlug);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new PAC machine with optional sub-specs' })
  create(@Body() data: CreateMachineDto) {
    return this.machinesService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a PAC machine and sub-specs' })
  update(@Param('id') id: string, @Body() data: Partial<CreateMachineDto>) {
    return this.machinesService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a PAC machine (Cascades child tables)' })
  delete(@Param('id') id: string) {
    return this.machinesService.delete(id);
  }
}
