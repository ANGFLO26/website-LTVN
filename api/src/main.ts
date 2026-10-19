import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { resolveCorsOptions } from './common/cors.util.js';
import { resolveTrustProxy } from './common/proxy.util.js';
import { SeoHtmlService } from './modules/seo/seo-html.service.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const configService = app.get(ConfigService);

  // Trust only explicitly configured reverse proxies. Direct connections ignore forwarding headers.
  const trustProxy = resolveTrustProxy(configService.get<string>('TRUST_PROXY'));
  app.getHttpAdapter().getInstance().set('trust proxy', trustProxy);

  app.enableCors(resolveCorsOptions(configService));
  app.setGlobalPrefix('api', {
    exclude: [
      'robots.txt',
      'sitemap.xml',
      'gioi-thieu',
      'pac',
      'tin-tuc-su-kien',
      'lien-he',
      'san-pham/:slug',
      'tin-tuc/:slug',
    ],
  });

  // Root HTML shell handler for GET /
  const seoHtmlService = app.get(SeoHtmlService);
  app.getHttpAdapter().get('/', async (_req: unknown, res: { setHeader: (k: string, v: string) => void; send: (body: string) => void }) => {
    const html = await seoHtmlService.renderRouteHtml('/');
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.send(html);
  });

  // Swagger OpenAPI Configuration
  const config = new DocumentBuilder()
    .setTitle('LTVN API')
    .setDescription('LTVN Backend API Documentation (OpenAPI / Swagger)')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Health', 'Health check and status endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'LTVN API Docs',
  });

  const port = process.env.PORT ?? 3000;
  const host = process.env.HOST;
  if (host) {
    await app.listen(port, host);
    logger.log(`NestJS API running on: http://${host}:${port}/api`);
  } else {
    await app.listen(port);
    logger.log(`NestJS API running on: http://localhost:${port}/api`);
  }
  logger.log(`Swagger documentation running on: http://localhost:${port}/api/docs`);
}
await bootstrap();
