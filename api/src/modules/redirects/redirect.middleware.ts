import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { RedirectsService } from './redirects.service.js';
import { isReservedPath, normalizeRedirectPath } from './redirects.util.js';

/**
 * Middleware that intercepts incoming HTTP GET & HEAD requests
 * and evaluates them against PostgreSQL redirects table.
 * If an active redirect is found, immediately returns HTTP 301 Moved Permanently
 * with the Location header and preserved query parameters.
 */
@Injectable()
export class RedirectMiddleware implements NestMiddleware {
  constructor(private readonly redirectsService: RedirectsService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Only intercept idempotent read methods
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }

    const pathname = req.path || '';
    let canonicalPath: string;
    try {
      canonicalPath = normalizeRedirectPath(pathname);
    } catch {
      return next();
    }

    if (isReservedPath(canonicalPath)) {
      return next();
    }

    try {
      const match = await this.redirectsService.resolve(canonicalPath);
      if (match) {
        // Query string preservation policy:
        // Preserve client query parameters (e.g., utm tags, tracking, filters)
        // The canonical database path may contain Unicode. Location must be a
        // valid URI path, with percent signs encoded exactly once per segment.
        let destination = match.destinationPath.split('/').map(encodeURIComponent).join('/');
        const rawUrl = req.originalUrl || req.url || '';
        const queryIdx = rawUrl.indexOf('?');
        if (queryIdx !== -1) {
          const incomingQuery = rawUrl.slice(queryIdx);
          if (destination.includes('?')) {
            destination += '&' + incomingQuery.slice(1);
          } else {
            destination += incomingQuery;
          }
        }

        res.setHeader('Location', destination);
        res.status(match.statusCode || 301);
        return res.end();
      }
    } catch {
      // In case of any unexpected resolver error, fail safe by continuing to next handler
    }

    next();
  }
}
