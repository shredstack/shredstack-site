CREATE TABLE "hyrox_session_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plan_session_id" integer,
	"completed_at" timestamp with time zone NOT NULL,
	"session_type" varchar(50) NOT NULL,
	"actual_duration_min" integer,
	"notes" text,
	"rpe" integer,
	"run_pace" varchar(50),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hyrox_station_benchmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"session_log_id" integer,
	"station" varchar(50) NOT NULL,
	"time_seconds" integer NOT NULL,
	"distance" varchar(50),
	"is_full_distance" boolean DEFAULT true,
	"notes" text,
	"source" varchar(50) NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hyrox_training_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"week" integer NOT NULL,
	"day_of_week" varchar(10) NOT NULL,
	"session_type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"target_pace" varchar(50),
	"target_duration_min" integer,
	"target_stations" text[],
	"phase" varchar(50) NOT NULL,
	"phase_number" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "hyrox_session_logs" ADD CONSTRAINT "hyrox_session_logs_user_id_crossfit_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."crossfit_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hyrox_session_logs" ADD CONSTRAINT "hyrox_session_logs_plan_session_id_hyrox_training_plans_id_fk" FOREIGN KEY ("plan_session_id") REFERENCES "public"."hyrox_training_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hyrox_station_benchmarks" ADD CONSTRAINT "hyrox_station_benchmarks_user_id_crossfit_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."crossfit_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hyrox_station_benchmarks" ADD CONSTRAINT "hyrox_station_benchmarks_session_log_id_hyrox_session_logs_id_fk" FOREIGN KEY ("session_log_id") REFERENCES "public"."hyrox_session_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hyrox_training_plans" ADD CONSTRAINT "hyrox_training_plans_user_id_crossfit_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."crossfit_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hyrox_training_plans_user_week_day_idx" ON "hyrox_training_plans" USING btree ("user_id","week","day_of_week");