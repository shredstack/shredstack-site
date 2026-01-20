CREATE TABLE "blog_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(500) NOT NULL,
	"excerpt" text NOT NULL,
	"content" text NOT NULL,
	"published" boolean DEFAULT false,
	"tags" text[] DEFAULT '{}',
	"color" varchar(50) DEFAULT 'rainbow-cyan',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"subject" varchar(500) NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"read" boolean DEFAULT false
);
