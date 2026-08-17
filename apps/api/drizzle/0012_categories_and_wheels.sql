-- Four additional Friday categories: add the enum values only.
--
-- The rows that USE these values are inserted in 0013. A new enum value cannot
-- be referenced in the same transaction that adds it (Postgres < 12 outright,
-- and drizzle wraps each migration file in one), so the INSERT must land in a
-- separate migration that runs after this one commits.
ALTER TYPE "category_slug" ADD VALUE IF NOT EXISTS 'category_a';--> statement-breakpoint
ALTER TYPE "category_slug" ADD VALUE IF NOT EXISTS 'category_b';--> statement-breakpoint
ALTER TYPE "category_slug" ADD VALUE IF NOT EXISTS 'category_c';--> statement-breakpoint
ALTER TYPE "category_slug" ADD VALUE IF NOT EXISTS 'category_d';--> statement-breakpoint

-- Spin wheel: a wheel an admin composes out of segments, spun by members.
CREATE TABLE IF NOT EXISTS "wheels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"created_by" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"one_per_member" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "wheel_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wheel_id" uuid NOT NULL,
	"label" varchar(200) NOT NULL,
	"color" varchar(9),
	"weight" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "wheel_spins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wheel_id" uuid NOT NULL,
	"segment_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"spun_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "wheels" ADD CONSTRAINT "wheels_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "wheel_segments" ADD CONSTRAINT "wheel_segments_wheel_id_wheels_id_fk" FOREIGN KEY ("wheel_id") REFERENCES "public"."wheels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "wheel_spins" ADD CONSTRAINT "wheel_spins_wheel_id_wheels_id_fk" FOREIGN KEY ("wheel_id") REFERENCES "public"."wheels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "wheel_spins" ADD CONSTRAINT "wheel_spins_segment_id_wheel_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."wheel_segments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "wheel_spins" ADD CONSTRAINT "wheel_spins_member_id_users_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "wheel_spins_wheel_idx" ON "wheel_spins" USING btree ("wheel_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wheel_spins_member_idx" ON "wheel_spins" USING btree ("member_id");
