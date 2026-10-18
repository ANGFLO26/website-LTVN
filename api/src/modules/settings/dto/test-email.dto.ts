export interface SendTestEmailResponseDto {
  success: boolean;
  message: string;
  recipient: string;
  messageId?: string;
}
