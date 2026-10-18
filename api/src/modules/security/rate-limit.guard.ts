import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import {
  RATE_LIMIT_METADATA_KEY,
  type RateLimitMetadataOptions,
} from './rate-limit.decorator.js';
import { RateLimiterService } from './rate-limiter.service.js';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimiter: RateLimiterService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitMetadataOptions | undefined>(
      RATE_LIMIT_METADATA_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!options || !options.scope) {
      return true;
    }

    const isTest =
      process.env.NODE_ENV === 'test' ||
      Boolean(process.env.VITEST) ||
      this.configService.get<string>('NODE_ENV') === 'test';
    const rateLimitEnabled = this.configService.get<string>('RATE_LIMIT_ENABLED');

    if (isTest && rateLimitEnabled !== 'true') {
      return true;
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const clientIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';

    try {
      const result = await this.rateLimiter.enforce(
        options.scope,
        clientIp,
        options.max,
        options.windowSeconds
      );

      if (res && typeof res.setHeader === 'function') {
        res.setHeader('X-RateLimit-Limit', String(result.maxRequests));
        res.setHeader('X-RateLimit-Remaining', String(result.remaining));
      }

      return true;
    } catch (err) {
      if (err instanceof HttpException) {
        const responseData = err.getResponse() as any;
        const retryAfter = responseData?.retryAfter;
        if (retryAfter && res && typeof res.setHeader === 'function') {
          res.setHeader('Retry-After', String(retryAfter));
        }
      }
      throw err;
    }
  }
}
