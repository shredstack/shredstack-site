CREATE TABLE "mobility_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"exercise_id" integer NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mobility_exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"day" integer NOT NULL,
	"order_in_day" integer NOT NULL,
	"category" varchar(32) NOT NULL,
	"name" varchar(255) NOT NULL,
	"sets_reps" varchar(64),
	"video_url" text,
	"video_filename" varchar(255),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mobility_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"day" integer NOT NULL,
	"session_date" date NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "mobility_completions" ADD CONSTRAINT "mobility_completions_session_id_mobility_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."mobility_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobility_completions" ADD CONSTRAINT "mobility_completions_exercise_id_mobility_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."mobility_exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mobility_completions_session_exercise_idx" ON "mobility_completions" USING btree ("session_id","exercise_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mobility_exercises_day_order_idx" ON "mobility_exercises" USING btree ("day","order_in_day");--> statement-breakpoint
CREATE INDEX "mobility_sessions_session_date_idx" ON "mobility_sessions" USING btree ("session_date");