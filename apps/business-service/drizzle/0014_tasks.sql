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
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "tasks_assignee_member_id_business_members_id_fk"
		FOREIGN KEY ("assignee_member_id") REFERENCES "public"."business_members"("id")
		ON DELETE set null ON UPDATE no action
);--> statement-breakpoint
CREATE TABLE "task_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"task_id" text NOT NULL,
	"author_user_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "task_comments_task_id_tasks_id_fk"
		FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id")
		ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint
CREATE TABLE "task_attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"task_id" text NOT NULL,
	"uploaded_by_user_id" text NOT NULL,
	"object_key" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "task_attachments_task_id_tasks_id_fk"
		FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id")
		ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint
CREATE INDEX "tasks_business_id_status_idx" ON "tasks" USING btree ("business_id", "status");--> statement-breakpoint
CREATE INDEX "tasks_business_id_assignee_member_id_idx" ON "tasks" USING btree ("business_id", "assignee_member_id");--> statement-breakpoint
CREATE INDEX "tasks_business_id_due_at_idx" ON "tasks" USING btree ("business_id", "due_at");--> statement-breakpoint
CREATE INDEX "task_comments_task_id_idx" ON "task_comments" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_attachments_task_id_idx" ON "task_attachments" USING btree ("task_id");
