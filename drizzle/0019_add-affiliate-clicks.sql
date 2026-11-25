CREATE TABLE "affiliate_clicks" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_slug" varchar(100) NOT NULL,
	"product_key" varchar(100),
	"placement" varchar(64) DEFAULT 'direct' NOT NULL,
	"referrer_host" varchar(255),
	"country" varchar(2),
	"device_type" varchar(10),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "affiliate_clicks_partner_created_idx" ON "affiliate_clicks" USING btree ("partner_slug","created_at");