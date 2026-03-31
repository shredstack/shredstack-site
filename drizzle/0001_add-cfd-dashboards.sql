CREATE TABLE "cfd_dashboards" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"data" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "cfd_dashboards_slug_unique" UNIQUE("slug")
);
