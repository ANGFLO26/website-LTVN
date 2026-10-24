import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

export const DRIZZLE = 'DRIZZLE';
export type DrizzleDb = PostgresJsDatabase<typeof schema>;

export const DEFAULT_DEV_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/ltvn_db';

export function resolveDatabaseUrl(configService?: {
  get: (key: string) => unknown;
}): string {
  const rawUrl = configService?.get('DATABASE_URL') ?? process.env.DATABASE_URL;
  const configured = typeof rawUrl === 'string' ? rawUrl.trim() : undefined;

  if (configured) {
    return configured;
  }

  const rawEnv = configService?.get('NODE_ENV') ?? process.env.NODE_ENV;
  const nodeEnv = typeof rawEnv === 'string' ? rawEnv.trim() : undefined;

  if (nodeEnv === 'production') {
    throw new Error(
      'DATABASE_URL environment variable is required in production'
    );
  }

  return DEFAULT_DEV_DATABASE_URL;
}

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): DrizzleDb => {
        const connectionString = resolveDatabaseUrl(configService);
        const client = postgres(connectionString);
        return drizzle(client, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
