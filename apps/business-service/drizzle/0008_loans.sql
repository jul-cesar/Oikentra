CREATE TABLE "loan_installments" (
	"id" text PRIMARY KEY NOT NULL,
	"loan_id" text NOT NULL,
	"number" integer NOT NULL,
	"due_date" date NOT NULL,
	"amount" bigint NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"business_id" text NOT NULL,
	"loan_id" text NOT NULL,
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
CREATE TABLE "loans" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"business_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"capital_amount" bigint NOT NULL,
	"interest_amount" bigint DEFAULT 0 NOT NULL,
	"total_amount" bigint NOT NULL,
	"term_count" integer DEFAULT 1 NOT NULL,
	"description" text,
	"loan_date" date NOT NULL,
	"due_date" date NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"cancellation_reason" text,
	"paid_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "loan_installments_loan_id_idx" ON "loan_installments" USING btree ("loan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "loan_payments_cash_movement_id_unique" ON "loan_payments" USING btree ("cash_movement_id");--> statement-breakpoint
CREATE INDEX "loan_payments_loan_id_status_idx" ON "loan_payments" USING btree ("loan_id","status");--> statement-breakpoint
CREATE INDEX "loan_payments_customer_id_date_idx" ON "loan_payments" USING btree ("customer_id","payment_date");--> statement-breakpoint
CREATE INDEX "loan_payments_business_id_date_idx" ON "loan_payments" USING btree ("business_id","payment_date");--> statement-breakpoint
CREATE INDEX "loans_business_id_status_idx" ON "loans" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "loans_customer_id_status_idx" ON "loans" USING btree ("customer_id","status");--> statement-breakpoint
CREATE INDEX "loans_business_id_loan_date_idx" ON "loans" USING btree ("business_id","loan_date");
