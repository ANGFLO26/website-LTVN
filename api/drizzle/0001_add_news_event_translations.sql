CREATE TABLE "news_event_translations" (
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
--> statement-breakpoint
ALTER TABLE "news_event_translations" ADD CONSTRAINT "news_event_translations_news_event_id_news_events_id_fk" FOREIGN KEY ("news_event_id") REFERENCES "public"."news_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "news_event_translations_event_id_idx" ON "news_event_translations" USING btree ("news_event_id");--> statement-breakpoint
CREATE INDEX "news_event_translations_locale_idx" ON "news_event_translations" USING btree ("locale");--> statement-breakpoint
CREATE INDEX "news_event_translations_slug_idx" ON "news_event_translations" USING btree ("slug");--> statement-breakpoint
-- Backfill existing news_events records into news_event_translations as 'vi' locale only.
-- 0 'en' records are generated. Existing legacy data strictly migrates to Vietnamese.
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