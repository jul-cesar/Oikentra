CREATE TABLE "credit_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"business_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" bigint NOT NULL,
	"note" text,
	"business_date" date NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"cancellation_reason" text,
	"cancelled_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "credit_movements_business_date_idx" ON "credit_movements" USING btree ("business_id","business_date");--> statement-breakpoint
CREATE INDEX "credit_movements_business_type_date_idx" ON "credit_movements" USING btree ("business_id","type","business_date");--> statement-breakpoint
CREATE INDEX "credit_movements_customer_date_idx" ON "credit_movements" USING btree ("customer_id","business_date");--> statement-breakpoint
CREATE INDEX "credit_movements_source_type_source_id_idx" ON "credit_movements" USING btree ("source_type","source_id");
