ALTER TABLE "cash_movements" ADD COLUMN "payment_method" text;--> statement-breakpoint
CREATE TABLE "business_payment_methods" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);--> statement-breakpoint
CREATE INDEX "business_payment_methods_business_id_idx" ON "business_payment_methods" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "business_payment_methods_business_status_idx" ON "business_payment_methods" USING btree ("business_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "business_payment_methods_business_name_unique" ON "business_payment_methods" USING btree ("business_id","name");
