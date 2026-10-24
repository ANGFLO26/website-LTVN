import { Module } from '@nestjs/common';
import { ContactsService } from './contacts.service.js';
import { ContactsController } from './contacts.controller.js';
import { ContactOutboxWorker } from './contact-outbox.worker.js';
import { EmailModule } from '../email/email.module.js';

@Module({
  imports: [EmailModule],
  controllers: [ContactsController],
  providers: [ContactsService, ContactOutboxWorker],
  exports: [ContactsService, ContactOutboxWorker],
})
export class ContactsModule {}
