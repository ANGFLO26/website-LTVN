CREATE TABLE "redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_path" varchar(500) NOT NULL,
	"destination_path" varchar(500) NOT NULL,
	"status_code" integer DEFAULT 301 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "redirects_source_path_unique" UNIQUE("source_path"),
	CONSTRAINT "redirects_status_code_check" CHECK ("redirects"."status_code" = 301),
	CONSTRAINT "redirects_source_path_check" CHECK ("redirects"."source_path" like '/%'),
	CONSTRAINT "redirects_destination_path_check" CHECK ("redirects"."destination_path" like '/%')
);
--> statement-breakpoint
CREATE INDEX "redirects_source_path_idx" ON "redirects" USING btree ("source_path");--> statement-breakpoint
CREATE INDEX "redirects_is_active_idx" ON "redirects" USING btree ("is_active");