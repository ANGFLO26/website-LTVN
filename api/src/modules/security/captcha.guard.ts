import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import {
  CAPTCHA_METADATA_KEY,
  type CaptchaMetadataOptions,
} from './captcha.decorator.js';
import { CaptchaService } from './captcha.service.js';

@Injectable()
export class CaptchaGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly captchaService: CaptchaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<CaptchaMetadataOptions | undefined>(
      CAPTCHA_METADATA_KEY,
      [context.getHandler(), context.getClass()]
    );

    // If endpoint is not decorated with @VerifyCaptcha, pass through
    if (!options) {
      return true;
    }

    if (!this.captchaService.isCaptchaRequired()) {
      return true;
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();

    // Extract token safely from headers or body
    const headerToken =
      req.headers['x-captcha-token'] || req.headers['cf-turnstile-response'];
    const bodyToken =
      typeof req.body === 'object' && req.body !== null
        ? req.body.captchaToken || req.body['cf-turnstile-response']
        : undefined;

    const token = typeof headerToken === 'string' ? headerToken : typeof bodyToken === 'string' ? bodyToken : undefined;

    if (!token) {
      throw new BadRequestException('Vui lòng hoàn tất mã kiểm tra bảo vệ (CAPTCHA).');
    }

    await this.captchaService.verify(token, {
      action: options.action,
      clientIp: req.ip,
    });

    return true;
  }
}
