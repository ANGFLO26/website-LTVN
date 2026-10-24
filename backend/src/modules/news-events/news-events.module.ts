import { Module } from '@nestjs/common';
import { NewsEventsService } from './news-events.service.js';
import { NewsEventsController } from './news-events.controller.js';
import { NewsEventsAdminController } from './news-events-admin.controller.js';

@Module({
  controllers: [NewsEventsController, NewsEventsAdminController],
  providers: [NewsEventsService],
  exports: [NewsEventsService],
})
export class NewsEventsModule {}
