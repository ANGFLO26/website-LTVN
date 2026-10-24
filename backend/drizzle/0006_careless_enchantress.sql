CREATE TABLE "rate_limit_buckets" (
	"key" varchar(160) PRIMARY KEY NOT NULL,
	"scope" varchar(50) NOT NULL,
	"subject_hash" varchar(64) NOT NULL,
	"request_count" integer DEFAULT 1 NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "rate_limit_buckets_expires_at_idx" ON "rate_limit_buckets" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "rate_limit_buckets_scope_idx" ON "rate_limit_buckets" USING btree ("scope");