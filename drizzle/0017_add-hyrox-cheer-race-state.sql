CREATE TABLE "hyrox_cheer_race_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"race_slug" varchar(100) NOT NULL,
	"start_override_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "hyrox_cheer_race_state_race_idx" ON "hyrox_cheer_race_state" USING btree ("race_slug");