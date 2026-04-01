CREATE TABLE "crossfit_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"canonical_name" varchar(255) NOT NULL,
	"aliases" text,
	"movement_type" varchar(50),
	"is_weighted" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "crossfit_movements_canonical_name_unique" UNIQUE("canonical_name")
);
--> statement-breakpoint
CREATE TABLE "crossfit_user_movement_performance" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_score_id" integer NOT NULL,
	"movement_id" integer NOT NULL,
	"estimated_actual_weight" real,
	"estimated_max_weight" real,
	"estimated_reps_completed" integer,
	"is_limiting_factor" boolean DEFAULT false,
	"inferred_scaling_detail" text,
	"confidence" varchar(20) DEFAULT 'medium',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crossfit_user_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"workout_id" integer NOT NULL,
	"workout_date" timestamp with time zone NOT NULL,
	"raw_score" varchar(500) NOT NULL,
	"raw_division" varchar(50),
	"raw_notes" text,
	"score_type" varchar(50),
	"ai_score_interpretation" text,
	"ai_analysis" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crossfit_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"last_upload_at" timestamp with time zone,
	"analysis_status" varchar(50) DEFAULT 'none',
	"analysis_progress" integer DEFAULT 0,
	"is_public" boolean DEFAULT false,
	"public_slug" varchar(50),
	"cached_insights" text,
	"insights_generated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "crossfit_users_email_unique" UNIQUE("email"),
	CONSTRAINT "crossfit_users_public_slug_unique" UNIQUE("public_slug")
);
--> statement-breakpoint
CREATE TABLE "crossfit_workout_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"parent_type" varchar(50) NOT NULL,
	"description" text,
	"is_monthly_challenge" boolean DEFAULT false,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "crossfit_workout_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "crossfit_workout_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"workout_id" integer NOT NULL,
	"movement_id" integer NOT NULL,
	"prescribed_reps" integer,
	"prescribed_sets" integer,
	"prescribed_weight" real,
	"prescribed_unit" varchar(20),
	"order_in_workout" integer
);
--> statement-breakpoint
CREATE TABLE "crossfit_workouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"description_hash" varchar(64) NOT NULL,
	"raw_title" text,
	"raw_description" text NOT NULL,
	"canonical_title" varchar(255),
	"title_source" varchar(20) DEFAULT 'raw',
	"workout_type" varchar(50),
	"category_id" integer,
	"similarity_cluster" varchar(100),
	"ai_summary" text,
	"is_monthly_challenge" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
DROP TABLE "smart_cfd_movements" CASCADE;--> statement-breakpoint
DROP TABLE "smart_cfd_users" CASCADE;--> statement-breakpoint
DROP TABLE "smart_cfd_workouts" CASCADE;--> statement-breakpoint
ALTER TABLE "crossfit_user_movement_performance" ADD CONSTRAINT "crossfit_user_movement_performance_user_score_id_crossfit_user_scores_id_fk" FOREIGN KEY ("user_score_id") REFERENCES "public"."crossfit_user_scores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crossfit_user_movement_performance" ADD CONSTRAINT "crossfit_user_movement_performance_movement_id_crossfit_movements_id_fk" FOREIGN KEY ("movement_id") REFERENCES "public"."crossfit_movements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crossfit_user_scores" ADD CONSTRAINT "crossfit_user_scores_user_id_crossfit_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."crossfit_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crossfit_user_scores" ADD CONSTRAINT "crossfit_user_scores_workout_id_crossfit_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."crossfit_workouts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crossfit_workout_movements" ADD CONSTRAINT "crossfit_workout_movements_workout_id_crossfit_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."crossfit_workouts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crossfit_workout_movements" ADD CONSTRAINT "crossfit_workout_movements_movement_id_crossfit_movements_id_fk" FOREIGN KEY ("movement_id") REFERENCES "public"."crossfit_movements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crossfit_workouts" ADD CONSTRAINT "crossfit_workouts_category_id_crossfit_workout_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."crossfit_workout_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "crossfit_user_scores_user_workout_date_idx" ON "crossfit_user_scores" USING btree ("user_id","workout_id","workout_date");--> statement-breakpoint
-- Seed default workout categories
INSERT INTO "crossfit_workout_categories" ("name", "parent_type", "is_monthly_challenge", "is_default") VALUES
  ('Heavy Barbell Strength', 'strength', false, true),
  ('Olympic Lifting', 'strength', false, true),
  ('Accessory Strength', 'strength', false, true),
  ('Sprint Metcon', 'conditioning', false, true),
  ('Mid-Length Metcon', 'conditioning', false, true),
  ('Long Chipper / Grinder', 'conditioning', false, true),
  ('Engine Builder', 'conditioning', false, true),
  ('Gymnastics Skill', 'skill_gymnastics', false, true),
  ('Bodyweight Conditioning', 'skill_gymnastics', false, true),
  ('Mixed Modal Test', 'other', false, true),
  ('Active Recovery / Mobility', 'other', false, true),
  ('Monthly Challenge', 'challenge', true, true);