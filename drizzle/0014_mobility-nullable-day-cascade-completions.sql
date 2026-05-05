ALTER TABLE "mobility_completions" DROP CONSTRAINT "mobility_completions_exercise_id_mobility_exercises_id_fk";
--> statement-breakpoint
DROP INDEX "mobility_exercises_day_order_idx";--> statement-breakpoint
ALTER TABLE "mobility_exercises" ALTER COLUMN "day" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "mobility_completions" ADD CONSTRAINT "mobility_completions_exercise_id_mobility_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."mobility_exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mobility_exercises_day_order_idx" ON "mobility_exercises" USING btree ("day","order_in_day");