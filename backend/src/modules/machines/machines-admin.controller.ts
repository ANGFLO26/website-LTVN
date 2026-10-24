import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MachinesService } from './machines.service.js';

@ApiTags('Admin Machines')
@ApiBearerAuth()
@Controller('admin/machines')
export class MachinesAdminController {
  constructor(private readonly machinesService: MachinesService) {}

  @Get()
  @ApiOperation({ summary: 'Get machines in all statuses for Admin' })
  findAll() {
    return this.machinesService.findAll();
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get an Admin machine by UUID or slug in any status' })
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.machinesService.findOne(idOrSlug);
  }
}
