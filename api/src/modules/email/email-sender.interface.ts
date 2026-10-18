export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

export interface SendEmailOptions {
  to: string;
  from?: string;
  subject: string;
  text: string;
  html: string;
  messageId?: string;
  headers?: Record<string, string>;
}

export interface EmailSenderResult {
  messageId: string;
}

export interface IEmailSender {
  send(options: SendEmailOptions): Promise<EmailSenderResult>;
}
