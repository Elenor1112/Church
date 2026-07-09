-- Restructure trivia into a multi-question quiz model.
-- No production trivia data exists, so we drop and recreate cleanly.

-- Old answers referenced trivia directly; drop them (they'll be re-collected per question).
DROP TABLE IF EXISTS "trivia_answers";--> statement-breakpoint

-- trivia becomes a quiz container: keep id/createdBy/isActive/expiresAt/createdAt, add title,
-- drop the inline single-question columns.
ALTER TABLE "trivia" DROP COLUMN IF EXISTS "question";--> statement-breakpoint
ALTER TABLE "trivia" DROP COLUMN IF EXISTS "options";--> statement-breakpoint
ALTER TABLE "trivia" DROP COLUMN IF EXISTS "correct_index";--> statement-breakpoint
ALTER TABLE "trivia" DROP COLUMN IF EXISTS "points";--> statement-breakpoint
ALTER TABLE "trivia" ADD COLUMN "title" varchar(200) NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "trivia" ALTER COLUMN "title" DROP DEFAULT;--> statement-breakpoint

-- Questions belonging to a quiz.
CREATE TABLE IF NOT EXISTS "trivia_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trivia_id" uuid NOT NULL,
	"question" varchar(500) NOT NULL,
	"options" text NOT NULL,
	"correct_index" integer NOT NULL,
	"points" integer DEFAULT 10 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);--> statement-breakpoint

-- Answers now reference a question.
CREATE TABLE IF NOT EXISTS "trivia_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"chosen_index" integer NOT NULL,
	"is_correct" boolean NOT NULL,
	"points_earned" integer DEFAULT 0 NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trivia_answers_member_question_uniq" UNIQUE("member_id","question_id")
);--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "trivia_questions" ADD CONSTRAINT "trivia_questions_trivia_id_trivia_id_fk" FOREIGN KEY ("trivia_id") REFERENCES "public"."trivia"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "trivia_answers" ADD CONSTRAINT "trivia_answers_question_id_trivia_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."trivia_questions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "trivia_answers" ADD CONSTRAINT "trivia_answers_member_id_users_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
