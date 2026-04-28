CREATE TABLE "daily_movers_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"logged_date" date NOT NULL,
	"cycle_week" integer NOT NULL,
	"slot" varchar(20) NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"notes" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "daily_movers_sessions" ADD CONSTRAINT "daily_movers_sessions_user_id_crossfit_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."crossfit_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_movers_sessions_user_date_slot_idx" ON "daily_movers_sessions" USING btree ("user_id","logged_date","slot");--> statement-breakpoint
CREATE INDEX "daily_movers_sessions_user_date_idx" ON "daily_movers_sessions" USING btree ("user_id","logged_date");