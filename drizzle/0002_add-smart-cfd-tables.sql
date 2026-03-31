CREATE TABLE "smart_cfd_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"workout_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"movement_name" varchar(255) NOT NULL,
	"prescribed_reps" integer,
	"prescribed_weight" real,
	"prescribed_unit" varchar(20),
	"estimated_actual_weight" real,
	"estimated_max_weight" real,
	"estimated_reps_completed" integer,
	"is_limiting_factor" boolean DEFAULT false,
	"confidence" varchar(20) DEFAULT 'medium'
);
--> statement-breakpoint
CREATE TABLE "smart_cfd_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"last_upload_at" timestamp with time zone,
	"analysis_status" varchar(50) DEFAULT 'none',
	"analysis_progress" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "smart_cfd_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "smart_cfd_workouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"raw_title" text,
	"raw_description" text NOT NULL,
	"raw_score" varchar(500) NOT NULL,
	"raw_division" varchar(50),
	"workout_date" timestamp with time zone NOT NULL,
	"workout_type" varchar(50),
	"score_type" varchar(50),
	"category" varchar(100),
	"similarity_cluster" varchar(100),
	"ai_summary" text,
	"ai_analysis" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "smart_cfd_movements" ADD CONSTRAINT "smart_cfd_movements_workout_id_smart_cfd_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."smart_cfd_workouts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_cfd_movements" ADD CONSTRAINT "smart_cfd_movements_user_id_smart_cfd_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."smart_cfd_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_cfd_workouts" ADD CONSTRAINT "smart_cfd_workouts_user_id_smart_cfd_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."smart_cfd_users"("id") ON DELETE no action ON UPDATE no action;