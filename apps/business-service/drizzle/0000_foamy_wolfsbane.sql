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
);
--> statement-breakpoint
CREATE TABLE "business_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"target_user_id" text,
	"identifier" text NOT NULL,
	"identifier_type" text NOT NULL,
	"role" text DEFAULT 'OPERATOR' NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_members" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'OPERATOR' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_payment_methods" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"business_type" text,
	"description" text,
	"logo_url" text,
	"logo_object_key" text,
	"currency_code" text DEFAULT 'COP' NOT NULL,
	"timezone" text DEFAULT 'America/Bogota' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cash_movement_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"business_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" bigint NOT NULL,
	"category" text,
	"payment_method" text,
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
	"due_date" date,
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
CREATE TABLE "loan_installments" (
	"id" text PRIMARY KEY NOT NULL,
	"loan_id" text NOT NULL,
	"number" integer NOT NULL,
	"due_date" date NOT NULL,
	"principal_amount" bigint NOT NULL,
	"interest_amount" bigint NOT NULL,
	"total_amount" bigint NOT NULL,
	"paid_amount" bigint DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
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
	"interest_rate" numeric(7, 4) DEFAULT 0 NOT NULL,
	"frequency" text DEFAULT 'MONTHLY' NOT NULL,
	"installment_amount" bigint DEFAULT 0 NOT NULL,
	"interest_amount" bigint DEFAULT 0 NOT NULL,
	"total_amount" bigint NOT NULL,
	"term_count" integer DEFAULT 1 NOT NULL,
	"description" text,
	"loan_date" date NOT NULL,
	"due_date" date NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"cancellation_reason" text,
	"paid_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_movements" (
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
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"task_id" text NOT NULL,
	"uploaded_by_user_id" text NOT NULL,
	"object_key" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"task_id" text NOT NULL,
	"author_user_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"assignee_member_id" text,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'TODO' NOT NULL,
	"priority" text DEFAULT 'MEDIUM' NOT NULL,
	"due_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scheduled_event_reminders" ADD CONSTRAINT "scheduled_event_reminders_event_id_business_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."business_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_member_id_business_members_id_fk" FOREIGN KEY ("assignee_member_id") REFERENCES "public"."business_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_events_business_id_start_at_idx" ON "business_events" USING btree ("business_id","start_at");--> statement-breakpoint
CREATE INDEX "business_events_business_id_status_idx" ON "business_events" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "business_invitations_business_status_idx" ON "business_invitations" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "business_invitations_identifier_status_idx" ON "business_invitations" USING btree ("identifier","status");--> statement-breakpoint
CREATE UNIQUE INDEX "business_members_business_user_unique" ON "business_members" USING btree ("business_id","user_id");--> statement-breakpoint
CREATE INDEX "business_members_user_status_idx" ON "business_members" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "business_members_business_status_idx" ON "business_members" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "business_payment_methods_business_id_idx" ON "business_payment_methods" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "business_payment_methods_business_status_idx" ON "business_payment_methods" USING btree ("business_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "business_payment_methods_business_name_unique" ON "business_payment_methods" USING btree ("business_id","name");--> statement-breakpoint
CREATE INDEX "businesses_owner_user_id_idx" ON "businesses" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "businesses_owner_user_id_status_idx" ON "businesses" USING btree ("owner_user_id","status");--> statement-breakpoint
CREATE INDEX "cash_movement_categories_business_id_idx" ON "cash_movement_categories" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "cash_movement_categories_business_status_idx" ON "cash_movement_categories" USING btree ("business_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "cash_movement_categories_business_name_unique" ON "cash_movement_categories" USING btree ("business_id","name");--> statement-breakpoint
CREATE INDEX "cash_movements_business_date_idx" ON "cash_movements" USING btree ("business_id","business_date");--> statement-breakpoint
CREATE INDEX "cash_movements_business_type_date_idx" ON "cash_movements" USING btree ("business_id","type","business_date");--> statement-breakpoint
CREATE INDEX "cash_movements_business_status_date_idx" ON "cash_movements" USING btree ("business_id","status","business_date");--> statement-breakpoint
CREATE INDEX "cash_movements_source_type_source_id_idx" ON "cash_movements" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "credit_movements_business_date_idx" ON "credit_movements" USING btree ("business_id","business_date");--> statement-breakpoint
CREATE INDEX "credit_movements_business_type_date_idx" ON "credit_movements" USING btree ("business_id","type","business_date");--> statement-breakpoint
CREATE INDEX "credit_movements_customer_date_idx" ON "credit_movements" USING btree ("customer_id","business_date");--> statement-breakpoint
CREATE INDEX "credit_movements_source_type_source_id_idx" ON "credit_movements" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_payments_cash_movement_id_unique" ON "credit_payments" USING btree ("cash_movement_id");--> statement-breakpoint
CREATE INDEX "credit_payments_credit_id_status_idx" ON "credit_payments" USING btree ("credit_id","status");--> statement-breakpoint
CREATE INDEX "credit_payments_customer_id_date_idx" ON "credit_payments" USING btree ("customer_id","payment_date");--> statement-breakpoint
CREATE INDEX "credit_payments_business_id_date_idx" ON "credit_payments" USING btree ("business_id","payment_date");--> statement-breakpoint
CREATE INDEX "credits_business_id_status_idx" ON "credits" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "credits_customer_id_status_idx" ON "credits" USING btree ("customer_id","status");--> statement-breakpoint
CREATE INDEX "credits_business_id_credit_date_idx" ON "credits" USING btree ("business_id","credit_date");--> statement-breakpoint
CREATE INDEX "credits_business_id_due_date_idx" ON "credits" USING btree ("business_id","due_date");--> statement-breakpoint
CREATE INDEX "customers_business_id_idx" ON "customers" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "customers_business_id_name_idx" ON "customers" USING btree ("business_id","name");--> statement-breakpoint
CREATE INDEX "customers_business_id_status_idx" ON "customers" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "loan_installments_loan_id_idx" ON "loan_installments" USING btree ("loan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "loan_installments_loan_id_number_unique" ON "loan_installments" USING btree ("loan_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "loan_payments_cash_movement_id_unique" ON "loan_payments" USING btree ("cash_movement_id");--> statement-breakpoint
CREATE INDEX "loan_payments_loan_id_status_idx" ON "loan_payments" USING btree ("loan_id","status");--> statement-breakpoint
CREATE INDEX "loan_payments_customer_id_date_idx" ON "loan_payments" USING btree ("customer_id","payment_date");--> statement-breakpoint
CREATE INDEX "loan_payments_business_id_date_idx" ON "loan_payments" USING btree ("business_id","payment_date");--> statement-breakpoint
CREATE INDEX "loans_business_id_status_idx" ON "loans" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "loans_customer_id_status_idx" ON "loans" USING btree ("customer_id","status");--> statement-breakpoint
CREATE INDEX "loans_business_id_loan_date_idx" ON "loans" USING btree ("business_id","loan_date");--> statement-breakpoint
CREATE INDEX "portfolio_movements_business_date_idx" ON "portfolio_movements" USING btree ("business_id","business_date");--> statement-breakpoint
CREATE INDEX "portfolio_movements_business_type_date_idx" ON "portfolio_movements" USING btree ("business_id","type","business_date");--> statement-breakpoint
CREATE INDEX "portfolio_movements_customer_date_idx" ON "portfolio_movements" USING btree ("customer_id","business_date");--> statement-breakpoint
CREATE INDEX "portfolio_movements_source_type_source_id_idx" ON "portfolio_movements" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scheduled_event_reminders_event_id_unique" ON "scheduled_event_reminders" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "scheduled_event_reminders_due_idx" ON "scheduled_event_reminders" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "task_attachments_task_id_idx" ON "task_attachments" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_comments_task_id_idx" ON "task_comments" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "tasks_business_id_status_idx" ON "tasks" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "tasks_business_id_assignee_member_id_idx" ON "tasks" USING btree ("business_id","assignee_member_id");--> statement-breakpoint
CREATE INDEX "tasks_business_id_due_at_idx" ON "tasks" USING btree ("business_id","due_at");