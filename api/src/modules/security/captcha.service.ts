import {
  Injectable,
  Logger,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface VerifyCaptchaOptions {
  action?: string;
  clientIp?: string;
}

export interface CaptchaVerificationResult {
  success: boolean;
  hostname?: string;
  action?: string;
  challengeTs?: string;
  errorCodes?: string[];
}

@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);
  private readonly secretKey?: string;
  private readonly isProduction: boolean;
  private readonly isEnabled: boolean;
  private readonly allowedHostnames: string[];

  constructor(private readonly configService: ConfigService) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const rawSecret = this.configService.get<string>('TURNSTILE_SECRET_KEY');
    this.secretKey = rawSecret ? rawSecret.trim() : undefined;

    const rawEnabled = this.configService.get<string>('TURNSTILE_ENABLED');

    if (this.isProduction) {
      if (rawEnabled === 'false') {
        throw new Error(
          'TURNSTILE_ENABLED cannot be set to false in production: CAPTCHA protection is mandatory'
        );
      }
      this.isEnabled = true;
    } else {
      this.isEnabled = rawEnabled === 'true' || Boolean(this.secretKey);
    }

    if (this.isProduction && (!this.secretKey || this.secretKey.length < 16)) {
      throw new Error(
        'TURNSTILE_SECRET_KEY environment variable is required and must be at least 16 characters in production'
      );
    }

    const hostSet = new Set<string>();

    const rawHosts = this.configService.get<string>('TURNSTILE_ALLOWED_HOSTNAMES');
    if (rawHosts) {
      for (const h of rawHosts.split(',')) {
        const clean = h.trim().toLowerCase();
        if (clean) hostSet.add(clean);
      }
    }

    // Derive allowed hostnames from configured production URLs
    const publicSiteUrl = this.configService.get<string>('PUBLIC_SITE_URL');
    if (publicSiteUrl) {
      try {
        const parsed = new URL(publicSiteUrl);
        if (parsed.hostname) hostSet.add(parsed.hostname.toLowerCase());
      } catch {}
    }

    const adminPublicUrl = this.configService.get<string>('ADMIN_PUBLIC_URL');
    if (adminPublicUrl) {
      try {
        const parsed = new URL(adminPublicUrl);
        if (parsed.hostname) hostSet.add(parsed.hostname.toLowerCase());
      } catch {}
    }

    if (this.isProduction) {
      // In production, strictly forbid localhost and loopback origins
      hostSet.delete('localhost');
      hostSet.delete('127.0.0.1');
      hostSet.delete('::1');
    } else {
      // In development / test, permit localhost by default if nothing specified
      if (hostSet.size === 0) {
        hostSet.add('localhost');
        hostSet.add('127.0.0.1');
      }
    }

    this.allowedHostnames = Array.from(hostSet);
    if (this.isProduction && this.allowedHostnames.length === 0) {
      throw new Error('TURNSTILE_ALLOWED_HOSTNAMES or public site URLs must define an allowed production hostname');
    }
  }

  /**
   * Returns whether CAPTCHA verification is required in the current runtime context.
   */
  isCaptchaRequired(): boolean {
    return this.isEnabled;
  }

  /**
   * Verifies a Cloudflare Turnstile token server-side.
   * Never logs or persists the token string.
   */
  async verify(
    token?: string | null,
    options: VerifyCaptchaOptions = {}
  ): Promise<CaptchaVerificationResult> {
    if (!this.isEnabled) {
      return { success: true };
    }

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      throw new BadRequestException('Vui lòng hoàn tất mã kiểm tra bảo vệ (CAPTCHA).');
    }

    const trimmedToken = token.trim();

    // Development & Test Mode controlled fake token handling
    if (!this.isProduction) {
      if (
        trimmedToken === 'mock-valid-turnstile-token' ||
        trimmedToken === '1x00000000000000000000AA' ||
        trimmedToken === 'test-valid-token'
      ) {
        return {
          success: true,
          action: options.action,
          hostname: 'localhost',
          challengeTs: new Date().toISOString(),
        };
      }

      if (
        trimmedToken === 'mock-invalid-turnstile-token' ||
        trimmedToken === '2x00000000000000000000AB' ||
        trimmedToken === 'invalid-token'
      ) {
        throw new BadRequestException('Mã xác thực bảo vệ (CAPTCHA) không hợp lệ hoặc đã hết hạn.');
      }

    }

    if (!this.secretKey) {
      throw new HttpException(
        'Dịch vụ xác thực bảo vệ tạm thời không khả dụng. Vui lòng thử lại sau.',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    // Call Cloudflare Turnstile verification endpoint
    const endpoint = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    const bodyParams = new URLSearchParams();
    bodyParams.set('secret', this.secretKey || '');
    bodyParams.set('response', trimmedToken);
    if (options.clientIp) {
      bodyParams.set('remoteip', options.clientIp);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bodyParams.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        this.logger.error(`Cloudflare Turnstile verify endpoint HTTP ${response.status}`);
        throw new HttpException(
          'Dịch vụ xác thực bảo vệ tạm thời gián đoạn. Vui lòng thử lại sau.',
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }

      const data = (await response.json()) as {
        success: boolean;
        'error-codes'?: string[];
        challenge_ts?: string;
        hostname?: string;
        action?: string;
      };

      if (data.success !== true) {
        this.logger.warn('Turnstile validation rejected by provider');
        throw new BadRequestException('Mã xác thực bảo vệ không hợp lệ hoặc đã hết hạn.');
      }

      // Validate action binding if expected
      if (options.action && (typeof data.action !== 'string' || data.action !== options.action)) {
        this.logger.warn('Turnstile action missing or mismatched');
        throw new BadRequestException('Mã xác thực bảo vệ không khớp với hành động được yêu cầu.');
      }

      // Validate hostname binding
      if (typeof data.hostname !== 'string' || !data.hostname) {
        this.logger.warn('Turnstile hostname missing');
        throw new BadRequestException('Mã xác thực bảo vệ thiếu tên miền xác thực.');
      }
      const normalizedHost = data.hostname.toLowerCase();
      if (
        this.isProduction &&
        (normalizedHost === 'localhost' || normalizedHost === '127.0.0.1' || normalizedHost === '::1')
      ) {
        this.logger.warn('Turnstile hostname rejected: localhost is strictly forbidden in production');
        throw new BadRequestException('Mã xác thực bảo vệ từ localhost không được phép trong môi trường production.');
      }

      if (!this.allowedHostnames.includes(normalizedHost)) {
        this.logger.warn('Turnstile hostname not in whitelist');
        throw new BadRequestException('Mã xác thực bảo vệ từ tên miền không được cấp phép.');
      }

      return {
        success: true,
        action: data.action,
        hostname: data.hostname,
        challengeTs: data.challenge_ts,
      };
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof HttpException) {
        throw err;
      }
      this.logger.error('Turnstile connection failure');
      // Fail closed in case of provider outage
      throw new HttpException(
        'Dịch vụ xác thực bảo vệ tạm thời không phản hồi. Vui lòng thử lại sau.',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }
}
