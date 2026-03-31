ALTER TABLE "smart_cfd_users" ADD COLUMN "cached_insights" text;--> statement-breakpoint
ALTER TABLE "smart_cfd_users" ADD COLUMN "insights_generated_at" timestamp with time zone;