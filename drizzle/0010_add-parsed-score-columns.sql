ALTER TABLE "crossfit_user_scores" ADD COLUMN "parsed_score_format" varchar(30);--> statement-breakpoint
ALTER TABLE "crossfit_user_scores" ADD COLUMN "parsed_score_data" jsonb;--> statement-breakpoint
ALTER TABLE "crossfit_user_scores" ADD COLUMN "score_processing_tier" varchar(20);