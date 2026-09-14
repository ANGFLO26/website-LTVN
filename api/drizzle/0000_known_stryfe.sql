CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"company_name" varchar(255),
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"subject" varchar(255),
	"message" text NOT NULL,
	"status" varchar(30) DEFAULT 'new' NOT NULL,
	"assigned_to" uuid,
	"admin_note" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contacts_status_check" CHECK ("contacts"."status" in ('new', 'processing', 'resolved', 'spam'))
);
--> statement-breakpoint
CREATE TABLE "machine_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"machine_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "machine_highlights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"machine_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"icon" varchar(255),
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "machine_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"machine_id" uuid NOT NULL,
	"image_id" uuid NOT NULL,
	"caption" varchar(255),
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "machine_images_machine_image_unique" UNIQUE("machine_id","image_id")
);
--> statement-breakpoint
CREATE TABLE "machine_specs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"machine_id" uuid NOT NULL,
	"group_name" varchar(255) NOT NULL,
	"spec_name" varchar(255) NOT NULL,
	"spec_value" text NOT NULL,
	"unit" varchar(100),
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "machine_standards" (
	"machine_id" uuid NOT NULL,
	"standard_id" uuid NOT NULL,
	"note" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "machine_standards_machine_id_standard_id_pk" PRIMARY KEY("machine_id","standard_id")
);
--> statement-breakpoint
CREATE TABLE "machines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"model" varchar(255),
	"short_description" text,
	"description" text,
	"main_image_id" uuid,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "machines_slug_unique" UNIQUE("slug"),
	CONSTRAINT "machines_status_check" CHECK ("machines"."status" in ('draft', 'published', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"storage_key" text NOT NULL,
	"public_url" text NOT NULL,
	"alt_text" varchar(255),
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" bigint NOT NULL,
	"width" integer,
	"height" integer,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "news_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(20) NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"short_description" text,
	"thumbnail_image_id" uuid,
	"content" jsonb,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"event_start_at" timestamp with time zone,
	"event_end_at" timestamp with time zone,
	"location" varchar(500),
	"author_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "news_events_slug_unique" UNIQUE("slug"),
	CONSTRAINT "news_events_type_check" CHECK ("news_events"."type" in ('news', 'event')),
	CONSTRAINT "news_events_status_check" CHECK ("news_events"."status" in ('draft', 'published', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "standards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(150) NOT NULL,
	"organization" varchar(50) NOT NULL,
	"year" integer,
	"title" varchar(500),
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "standards_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"role" varchar(30) NOT NULL,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_role_check" CHECK ("users"."role" in ('admin', 'editor')),
	CONSTRAINT "users_status_check" CHECK ("users"."status" in ('active', 'inactive'))
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_applications" ADD CONSTRAINT "machine_applications_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_highlights" ADD CONSTRAINT "machine_highlights_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_images" ADD CONSTRAINT "machine_images_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_images" ADD CONSTRAINT "machine_images_image_id_media_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_specs" ADD CONSTRAINT "machine_specs_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_standards" ADD CONSTRAINT "machine_standards_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_standards" ADD CONSTRAINT "machine_standards_standard_id_standards_id_fk" FOREIGN KEY ("standard_id") REFERENCES "public"."standards"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machines" ADD CONSTRAINT "machines_main_image_id_media_assets_id_fk" FOREIGN KEY ("main_image_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machines" ADD CONSTRAINT "machines_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machines" ADD CONSTRAINT "machines_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_events" ADD CONSTRAINT "news_events_thumbnail_image_id_media_assets_id_fk" FOREIGN KEY ("thumbnail_image_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_events" ADD CONSTRAINT "news_events_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contacts_status_idx" ON "contacts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "contacts_created_at_idx" ON "contacts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "contacts_assigned_to_idx" ON "contacts" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "machine_applications_machine_id_idx" ON "machine_applications" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX "machine_highlights_machine_id_idx" ON "machine_highlights" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX "machine_images_machine_id_idx" ON "machine_images" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX "machine_images_image_id_idx" ON "machine_images" USING btree ("image_id");--> statement-breakpoint
CREATE INDEX "machine_specs_machine_id_idx" ON "machine_specs" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX "machine_specs_group_name_idx" ON "machine_specs" USING btree ("group_name");--> statement-breakpoint
CREATE INDEX "machine_standards_machine_id_idx" ON "machine_standards" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX "machine_standards_standard_id_idx" ON "machine_standards" USING btree ("standard_id");--> statement-breakpoint
CREATE INDEX "machines_status_idx" ON "machines" USING btree ("status");--> statement-breakpoint
CREATE INDEX "machines_published_at_idx" ON "machines" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "machines_sort_order_idx" ON "machines" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "machines_deleted_at_idx" ON "machines" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "machines_created_by_idx" ON "machines" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "media_assets_uploaded_by_idx" ON "media_assets" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "media_assets_deleted_at_idx" ON "media_assets" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "news_events_type_idx" ON "news_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "news_events_status_idx" ON "news_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "news_events_published_at_idx" ON "news_events" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "news_events_event_start_at_idx" ON "news_events" USING btree ("event_start_at");--> statement-breakpoint
CREATE INDEX "news_events_author_id_idx" ON "news_events" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "news_events_deleted_at_idx" ON "news_events" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "standards_organization_idx" ON "standards" USING btree ("organization");--> statement-breakpoint
CREATE INDEX "standards_code_idx" ON "standards" USING btree ("code");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_deleted_at_idx" ON "users" USING btree ("deleted_at");