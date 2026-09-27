CREATE TABLE "scheduled_event_reminders" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"recipient_email" text NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone NOT NULL,
	"locked_until" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "scheduled_event_reminders_event_id_business_events_id_fk"
		FOREIGN KEY ("event_id") REFERENCES "public"."business_events"("id")
		ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint
CREATE UNIQUE INDEX "scheduled_event_reminders_event_id_unique" ON "scheduled_event_reminders" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "scheduled_event_reminders_due_idx" ON "scheduled_event_reminders" USING btree ("status", "next_attempt_at");
