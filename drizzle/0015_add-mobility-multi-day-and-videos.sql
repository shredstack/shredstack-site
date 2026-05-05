CREATE TABLE "mobility_exercise_days" (
	"id" serial PRIMARY KEY NOT NULL,
	"exercise_id" integer NOT NULL,
	"day" integer NOT NULL,
	"order_in_day" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mobility_exercise_videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"exercise_id" integer NOT NULL,
	"url" text NOT NULL,
	"filename" varchar(255),
	"label" varchar(100),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "mobility_exercises_day_order_idx";--> statement-breakpoint
ALTER TABLE "mobility_exercise_days" ADD CONSTRAINT "mobility_exercise_days_exercise_id_mobility_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."mobility_exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobility_exercise_videos" ADD CONSTRAINT "mobility_exercise_videos_exercise_id_mobility_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."mobility_exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mobility_exercise_days_exercise_day_idx" ON "mobility_exercise_days" USING btree ("exercise_id","day");--> statement-breakpoint
CREATE INDEX "mobility_exercise_days_day_order_idx" ON "mobility_exercise_days" USING btree ("day","order_in_day");--> statement-breakpoint
CREATE INDEX "mobility_exercise_videos_exercise_idx" ON "mobility_exercise_videos" USING btree ("exercise_id","sort_order");--> statement-breakpoint
-- Backfill mobility_exercise_days from the old per-row day column.
INSERT INTO "mobility_exercise_days" ("exercise_id", "day", "order_in_day")
SELECT "id", "day", "order_in_day"
FROM "mobility_exercises"
WHERE "day" IS NOT NULL;--> statement-breakpoint
-- Backfill mobility_exercise_videos from the old single videoUrl column.
INSERT INTO "mobility_exercise_videos" ("exercise_id", "url", "filename", "sort_order")
SELECT "id", "video_url", "video_filename", 0
FROM "mobility_exercises"
WHERE "video_url" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "mobility_exercises" DROP COLUMN "day";--> statement-breakpoint
ALTER TABLE "mobility_exercises" DROP COLUMN "video_url";--> statement-breakpoint
ALTER TABLE "mobility_exercises" DROP COLUMN "video_filename";