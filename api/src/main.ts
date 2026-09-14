import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.setGlobalPrefix('api');

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
  await app.listen(port);
  console.log(`NestJS API running on: http://localhost:${port}/api`);
  console.log(`Swagger documentation running on: http://localhost:${port}/api/docs`);
}
await bootstrap();
