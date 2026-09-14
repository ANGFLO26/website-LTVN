import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

export const DRIZZLE = 'DRIZZLE';
export type DrizzleDb = PostgresJsDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): DrizzleDb => {
        const connectionString =
          configService.get<string>('DATABASE_URL') ||
          'postgresql://postgres:postgres@localhost:5432/ltvn_db';

        const client = postgres(connectionString);
        return drizzle(client, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
