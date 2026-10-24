import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { DRIZZLE } from '../src/database/database.module.js';
import { resolveCorsOptions } from '../src/common/cors.util.js';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('CORS Enforcement (E2E HTTP Proofs - PR-02)', () => {
  let app: INestApplication<App>;
  const allowedOrigin = 'https://client.example.com';
  const disallowedOrigin = 'https://evil.example.com';

  beforeEach(async () => {
    const configService = new ConfigService({
      JWT_SECRET: randomBytes(48).toString('base64url'),
      JWT_TTL_SECONDS: '3600',
      NODE_ENV: 'production',
      CORS_ALLOWED_ORIGINS: `${allowedOrigin},https://admin.example.com`,
      PUBLIC_SITE_URL: 'https://client.example.com',
      RATE_LIMIT_HASH_SECRET: 'test-rate-limit-hash-secret-min16',
      TURNSTILE_SECRET_KEY: 'test-turnstile-secret-min16',
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService).useValue(configService)
      .overrideProvider(DRIZZLE).useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableCors(resolveCorsOptions(configService));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('Allowed Origin: returns exact Access-Control-Allow-Origin header', async () => {
    const res = await request(app.getHttpServer())
      .get('/api')
      .set('Origin', allowedOrigin)
      .expect(200);

    expect(res.headers['access-control-allow-origin']).toBe(allowedOrigin);
  });

  it('Disallowed Origin: does not return permissive Access-Control-Allow-Origin header', async () => {
    const res = await request(app.getHttpServer())
      .get('/api')
      .set('Origin', disallowedOrigin)
      .expect(200);

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('Preflight for Allowed Origin: returns 204 with required CORS headers', async () => {
    const res = await request(app.getHttpServer())
      .options('/api')
      .set('Origin', allowedOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Authorization, Content-Type')
      .expect(204);

    expect(res.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(res.headers['access-control-allow-methods']).toMatch(/POST/);
    expect(res.headers['access-control-allow-headers']).toMatch(/Authorization/i);
  });

  it('Preflight for Disallowed Origin: does not grant Access-Control-Allow-Origin', async () => {
    const res = await request(app.getHttpServer())
      .options('/api')
      .set('Origin', disallowedOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Authorization, Content-Type');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('No-Origin Request (curl / health check): succeeds with 200 OK without CORS headers', async () => {
    const res = await request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect('Hello World!');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('Production fail-closed: throws if CORS_ALLOWED_ORIGINS is missing', async () => {
    const invalidConfig = new ConfigService({
      JWT_SECRET: randomBytes(48).toString('base64url'),
      JWT_TTL_SECONDS: '3600',
      NODE_ENV: 'production',
      // CORS_ALLOWED_ORIGINS omitted
    });

    expect(() => resolveCorsOptions(invalidConfig)).toThrow(
      /CORS_ALLOWED_ORIGINS environment variable is required/,
    );
  });
});
