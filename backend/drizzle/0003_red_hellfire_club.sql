CREATE TABLE "contact_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_outbox_status_check" CHECK ("contact_outbox"."status" in ('pending', 'processing', 'sent', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "contact_outbox" ADD CONSTRAINT "contact_outbox_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_outbox_status_next_attempt_idx" ON "contact_outbox" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "contact_outbox_contact_id_idx" ON "contact_outbox" USING btree ("contact_id");