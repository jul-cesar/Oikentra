CREATE TABLE "businesses" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"business_type" text,
	"currency_code" text DEFAULT 'COP' NOT NULL,
	"timezone" text DEFAULT 'America/Bogota' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cash_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"business_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" bigint NOT NULL,
	"category" text,
	"note" text,
	"business_date" date NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"source_type" text,
	"source_id" text,
	"cancellation_reason" text,
	"cancelled_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"business_id" text NOT NULL,
	"credit_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"cash_movement_id" text NOT NULL,
	"amount" bigint NOT NULL,
	"payment_date" date NOT NULL,
	"note" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"cancellation_reason" text,
	"cancelled_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credits" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"business_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"original_amount" bigint NOT NULL,
	"description" text,
	"credit_date" date NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"cancellation_reason" text,
	"paid_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"business_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"notes" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "businesses_owner_user_id_idx" ON "businesses" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "businesses_owner_user_id_status_idx" ON "businesses" USING btree ("owner_user_id","status");--> statement-breakpoint
CREATE INDEX "cash_movements_business_date_idx" ON "cash_movements" USING btree ("business_id","business_date");--> statement-breakpoint
CREATE INDEX "cash_movements_business_type_date_idx" ON "cash_movements" USING btree ("business_id","type","business_date");--> statement-breakpoint
CREATE INDEX "cash_movements_business_status_date_idx" ON "cash_movements" USING btree ("business_id","status","business_date");--> statement-breakpoint
CREATE UNIQUE INDEX "cash_movements_source_unique" ON "cash_movements" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_payments_cash_movement_id_unique" ON "credit_payments" USING btree ("cash_movement_id");--> statement-breakpoint
CREATE INDEX "credit_payments_credit_id_status_idx" ON "credit_payments" USING btree ("credit_id","status");--> statement-breakpoint
CREATE INDEX "credit_payments_customer_id_date_idx" ON "credit_payments" USING btree ("customer_id","payment_date");--> statement-breakpoint
CREATE INDEX "credit_payments_business_id_date_idx" ON "credit_payments" USING btree ("business_id","payment_date");--> statement-breakpoint
CREATE INDEX "credits_business_id_status_idx" ON "credits" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "credits_customer_id_status_idx" ON "credits" USING btree ("customer_id","status");--> statement-breakpoint
CREATE INDEX "credits_business_id_credit_date_idx" ON "credits" USING btree ("business_id","credit_date");--> statement-breakpoint
CREATE INDEX "customers_business_id_idx" ON "customers" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "customers_business_id_name_idx" ON "customers" USING btree ("business_id","name");--> statement-breakpoint
CREATE INDEX "customers_business_id_status_idx" ON "customers" USING btree ("business_id","status");