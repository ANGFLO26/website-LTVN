import { Module } from '@nestjs/common';
import { NewsEventsService } from './news-events.service.js';
import { NewsEventsController } from './news-events.controller.js';

@Module({
  controllers: [NewsEventsController],
  providers: [NewsEventsService],
  exports: [NewsEventsService],
})
export class NewsEventsModule {}
