CREATE TABLE "user_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"country_code" text NOT NULL,
	"department" text,
	"city" text NOT NULL,
	"phone" text,
	"profile_completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_profiles_country_code_idx" ON "user_profiles" USING btree ("country_code");
