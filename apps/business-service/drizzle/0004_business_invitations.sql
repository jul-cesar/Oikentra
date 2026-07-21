CREATE TABLE "business_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"identifier" text NOT NULL,
	"identifier_type" text NOT NULL,
	"role" text DEFAULT 'OPERATOR' NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "business_invitations_business_status_idx" ON "business_invitations" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "business_invitations_identifier_status_idx" ON "business_invitations" USING btree ("identifier","status");