CREATE TABLE IF NOT EXISTS "business_members" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'OPERATOR' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "business_members_business_user_unique" ON "business_members" USING btree ("business_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "business_members_user_status_idx" ON "business_members" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "business_members_business_status_idx" ON "business_members" USING btree ("business_id","status");--> statement-breakpoint
INSERT INTO "business_members" ("id", "business_id", "user_id", "role", "status", "created_at", "updated_at")
SELECT md5(b.id || ':' || b.owner_user_id), b.id, b.owner_user_id, 'OWNER', 'ACTIVE', b.created_at, b.updated_at
FROM "businesses" b
WHERE b.deleted_at IS NULL
ON CONFLICT ("business_id", "user_id") DO NOTHING;