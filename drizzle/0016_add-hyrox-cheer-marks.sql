CREATE TABLE "hyrox_cheer_marks" (
	"id" serial PRIMARY KEY NOT NULL,
	"race_slug" varchar(100) NOT NULL,
	"segment_index" integer NOT NULL,
	"marked_at" timestamp with time zone,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "hyrox_cheer_marks_race_segment_idx" ON "hyrox_cheer_marks" USING btree ("race_slug","segment_index");