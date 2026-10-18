import { Module, type OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { DatabaseModule } from '../../database/database.module.js';
import { RedirectsService } from './redirects.service.js';
import { RedirectsController } from './redirects.controller.js';
import { RedirectMiddleware } from './redirect.middleware.js';

@Module({
  imports: [DatabaseModule],
  controllers: [RedirectsController],
  providers: [RedirectsService, RedirectMiddleware],
  exports: [RedirectsService, RedirectMiddleware],
})
export class RedirectsModule implements OnModuleInit {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly redirectMiddleware: RedirectMiddleware,
  ) {}

  onModuleInit() {
    const httpAdapter = this.httpAdapterHost?.httpAdapter;
    if (httpAdapter && typeof httpAdapter.getInstance === 'function') {
      const expressApp = httpAdapter.getInstance();
      if (typeof expressApp.use === 'function') {
        expressApp.use((req: any, res: any, next: any) => {
          void this.redirectMiddleware.use(req, res, next);
        });
      }
    }
  }
}
