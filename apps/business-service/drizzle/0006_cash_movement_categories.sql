CREATE TABLE "cash_movement_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "cash_movement_categories_business_id_idx" ON "cash_movement_categories" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "cash_movement_categories_business_status_idx" ON "cash_movement_categories" USING btree ("business_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "cash_movement_categories_business_name_unique" ON "cash_movement_categories" USING btree ("business_id","name");
