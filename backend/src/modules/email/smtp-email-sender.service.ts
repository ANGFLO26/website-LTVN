import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { EmailConfigService, type SmtpConfig } from './email.config.js';
import { classifySmtpFailure, SmtpDeliveryError } from './smtp-failure.js';
import type {
  IEmailSender,
  SendEmailOptions,
  EmailSenderResult,
} from './email-sender.interface.js';

@Injectable()
export class SmtpEmailSenderService implements IEmailSender {
  private readonly logger = new Logger(SmtpEmailSenderService.name);
  private cachedTransporter: Transporter | null = null;
  private lastConfigSignature = '';

  constructor(private readonly emailConfig: EmailConfigService) {}

  private getTransporter(config: SmtpConfig): Transporter {
    const signature = `${config.host}:${config.port}:${config.secure}:${config.auth?.user || ''}:${config.auth?.pass || ''}`;
    if (this.cachedTransporter && this.lastConfigSignature === signature) {
      return this.cachedTransporter;
    }

    const transporterOptions: Record<string, unknown> = {
      host: config.host,
      port: config.port,
      secure: config.secure,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    };

    if (config.auth) {
      transporterOptions.auth = {
        user: config.auth.user,
        pass: config.auth.pass,
      };
    }

    this.cachedTransporter = nodemailer.createTransport(
      transporterOptions as Parameters<typeof nodemailer.createTransport>[0],
    );
    this.lastConfigSignature = signature;
    return this.cachedTransporter;
  }

  async send(options: SendEmailOptions): Promise<EmailSenderResult> {
    try {
      const config = await this.emailConfig.getEffectiveSmtpConfig();
      if (!config) throw new SmtpDeliveryError('SMTP_CONFIGURATION');
      const transporter = this.getTransporter(config);
      const from = options.from || config.from || 'no-reply@ltvietnam.com.vn';
      const info = await transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        messageId: options.messageId,
        headers: options.headers,
      });

      return {
        messageId: info.messageId || options.messageId || 'unknown-message-id',
      };
    } catch (error) {
      const failureCode = classifySmtpFailure(error);
      this.logger.error(`Gửi email SMTP thất bại. code=${failureCode}`);
      throw new SmtpDeliveryError(failureCode);
    }
  }
}
