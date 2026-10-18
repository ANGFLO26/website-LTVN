import { SetMetadata } from '@nestjs/common';

export const CAPTCHA_METADATA_KEY = 'security:captcha';

export interface CaptchaMetadataOptions {
  action?: string;
}

/**
 * Decorator to enforce Cloudflare Turnstile CAPTCHA / anti-bot verification on a route.
 */
export const VerifyCaptcha = (options?: CaptchaMetadataOptions) =>
  SetMetadata(CAPTCHA_METADATA_KEY, options || {});
