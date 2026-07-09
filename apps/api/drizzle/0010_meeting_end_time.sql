ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "end_time" varchar(5) NOT NULL DEFAULT '12:30';
--> statement-breakpoint
-- Backfill end_time from start_time + duration_minutes for existing rows.
UPDATE "meetings"
SET "end_time" = to_char(
  (start_time::time + make_interval(mins => duration_minutes)),
  'HH24:MI'
)
WHERE "duration_minutes" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "meetings" DROP COLUMN IF EXISTS "duration_minutes";
