ALTER TABLE "smart_cfd_users" ADD COLUMN "is_public" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "smart_cfd_users" ADD COLUMN "public_slug" varchar(50);--> statement-breakpoint
ALTER TABLE "smart_cfd_users" ADD CONSTRAINT "smart_cfd_users_public_slug_unique" UNIQUE("public_slug");