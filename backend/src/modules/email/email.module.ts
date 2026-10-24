import { Module } from '@nestjs/common';
import { EmailConfigService } from './email.config.js';
import { EMAIL_SENDER } from './email-sender.interface.js';
import { SmtpEmailSenderService } from './smtp-email-sender.service.js';

@Module({
  providers: [
    EmailConfigService,
    {
      provide: EMAIL_SENDER,
      useClass: SmtpEmailSenderService,
    },
  ],
  exports: [EmailConfigService, EMAIL_SENDER],
})
export class EmailModule {}
