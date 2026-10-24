import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RateLimiterService } from './rate-limiter.service.js';
import { CaptchaService } from './captcha.service.js';
import { RateLimitGuard } from './rate-limit.guard.js';
import { CaptchaGuard } from './captcha.guard.js';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    RateLimiterService,
    CaptchaService,
    RateLimitGuard,
    CaptchaGuard,
  ],
  exports: [
    RateLimiterService,
    CaptchaService,
    RateLimitGuard,
    CaptchaGuard,
  ],
})
export class SecurityModule {}
