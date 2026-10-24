import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_METADATA_KEY = 'security:rate_limit';

export interface RateLimitMetadataOptions {
  scope: string;
  max?: number;
  windowSeconds?: number;
}

/**
 * Decorator to enforce distributed rate limiting on a controller or route handler.
 */
export const RateLimit = (options: RateLimitMetadataOptions) =>
  SetMetadata(RATE_LIMIT_METADATA_KEY, options);
