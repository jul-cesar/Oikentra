ALTER TABLE "credits" ADD COLUMN "due_date" date;--> statement-breakpoint
CREATE TABLE "business_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"business_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"all_day" boolean DEFAULT false NOT NULL,
	"reminder_at" timestamp with time zone,
	"status" text DEFAULT 'SCHEDULED' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);--> statement-breakpoint
CREATE INDEX "business_events_business_id_start_at_idx" ON "business_events" USING btree ("business_id", "start_at");--> statement-breakpoint
CREATE INDEX "business_events_business_id_status_idx" ON "business_events" USING btree ("business_id", "status");--> statement-breakpoint
CREATE INDEX "credits_business_id_due_date_idx" ON "credits" USING btree ("business_id", "due_date");
