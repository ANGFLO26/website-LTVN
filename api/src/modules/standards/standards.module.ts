import { Module } from '@nestjs/common';
import { StandardsService } from './standards.service.js';
import { StandardsController } from './standards.controller.js';

@Module({
  controllers: [StandardsController],
  providers: [StandardsService],
  exports: [StandardsService],
})
export class StandardsModule {}
