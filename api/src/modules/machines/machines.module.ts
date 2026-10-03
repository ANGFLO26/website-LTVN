import { Module } from '@nestjs/common';
import { MachinesService } from './machines.service.js';
import { MachinesController } from './machines.controller.js';
import { MachinesAdminController } from './machines-admin.controller.js';

@Module({
  controllers: [MachinesController, MachinesAdminController],
  providers: [MachinesService],
  exports: [MachinesService],
})
export class MachinesModule {}
