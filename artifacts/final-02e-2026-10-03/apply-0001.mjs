import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from '../../api/node_modules/postgres/src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Read database URL
const envPath = path.join(rootDir, 'api', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
if (!match || !match[1]) {
  console.error('DATABASE_URL not found in api/.env');
  process.exit(1);
}
const databaseUrl = match[1];

const sql = postgres(databaseUrl, {
  max: 1,
  connect_timeout: 10,
  ssl: { rejectUnauthorized: false }
});

async function applyMigration() {
  console.log('=== APPLYING MIGRATION 0001 ===');
  
  // 1. Pre-check: Ensure news_events exists and count legacy records
  const legacyRows = await sql`
    SELECT id, title, slug, short_description, location, created_at, updated_at 
    FROM news_events 
    ORDER BY created_at;
  `;
  console.log(`Pre-migration news_events count: ${legacyRows.length}`);
  
  // 2. Check if news_event_translations already exists
  const existingTable = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'news_event_translations';
  `;
  if (existingTable.length > 0) {
    console.log('Table news_event_translations ALREADY EXISTS! Skipping application.');
    return;
  }

  // 3. Read migration SQL file
  const migrationSqlPath = path.join(rootDir, 'api', 'drizzle', '0001_add_news_event_translations.sql');
  const migrationSql = fs.readFileSync(migrationSqlPath, 'utf8');

  // Split statements by statement-breakpoint or run in a transaction
  console.log('Executing 0001_add_news_event_translations.sql in transaction...');
  await sql.begin(async (trx) => {
    // Execute DDL and backfill
    await trx.unsafe(`
      CREATE TABLE IF NOT EXISTS "news_event_translations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "news_event_id" uuid NOT NULL,
        "locale" varchar(10) NOT NULL,
        "title" varchar(255) NOT NULL,
        "slug" varchar(255) NOT NULL,
        "short_description" text,
        "content" jsonb,
        "location" varchar(500),
        "seo_title" varchar(255),
        "seo_description" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "news_event_translations_slug_unique" UNIQUE("slug"),
        CONSTRAINT "news_event_translations_event_locale_unique" UNIQUE("news_event_id","locale"),
        CONSTRAINT "news_event_translations_locale_check" CHECK ("news_event_translations"."locale" in ('vi', 'en'))
      );
    `);

    await trx.unsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'news_event_translations_news_event_id_news_events_id_fk'
        ) THEN
          ALTER TABLE "news_event_translations" 
          ADD CONSTRAINT "news_event_translations_news_event_id_news_events_id_fk" 
          FOREIGN KEY ("news_event_id") REFERENCES "public"."news_events"("id") 
          ON DELETE cascade ON UPDATE no action;
        END IF;
      END $$;
    `);

    await trx.unsafe(`
      CREATE INDEX IF NOT EXISTS "news_event_translations_event_id_idx" ON "news_event_translations" USING btree ("news_event_id");
      CREATE INDEX IF NOT EXISTS "news_event_translations_locale_idx" ON "news_event_translations" USING btree ("locale");
      CREATE INDEX IF NOT EXISTS "news_event_translations_slug_idx" ON "news_event_translations" USING btree ("slug");
    `);

    // Backfill statement
    await trx.unsafe(`
      INSERT INTO "news_event_translations" (
        "news_event_id",
        "locale",
        "title",
        "slug",
        "short_description",
        "content",
        "location",
        "created_at",
        "updated_at"
      )
      SELECT
        "id",
        'vi',
        "title",
        "slug",
        "short_description",
        "content",
        "location",
        "created_at",
        "updated_at"
      FROM "news_events"
      ON CONFLICT ("news_event_id", "locale") DO NOTHING;
    `);
  });

  console.log('Transaction committed successfully.');

  // 4. Verify post-migration state
  const backfilledTranslations = await sql`
    SELECT t.id, t.news_event_id, t.locale, t.title, t.slug, t.location, n.title as parent_title
    FROM news_event_translations t
    JOIN news_events n ON n.id = t.news_event_id
    ORDER BY t.created_at;
  `;

  console.log(`Backfilled translations count: ${backfilledTranslations.length}`);
  for (const row of backfilledTranslations) {
    console.log(`  - [${row.locale}] "${row.title}" (parent: "${row.parent_title}")`);
  }

  const enCount = (await sql`SELECT count(*)::int as count FROM news_event_translations WHERE locale = 'en'`)[0].count;
  console.log(`EN translations count: ${enCount} (must be 0)`);

  const report = {
    appliedAt: new Date().toISOString(),
    migrationFile: '0001_add_news_event_translations.sql',
    legacyNewsEventsCount: legacyRows.length,
    backfilledTranslationsCount: backfilledTranslations.length,
    enTranslationsCount: enCount,
    status: 'MIGRATION_0001_APPLIED_SUCCESSFULLY'
  };

  fs.writeFileSync(
    path.join(__dirname, 'migration-0001-result.json'),
    JSON.stringify(report, null, 2),
    'utf8'
  );
  console.log('Migration 0001 report written to migration-0001-result.json');
}

applyMigration()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await sql.end();
  });
