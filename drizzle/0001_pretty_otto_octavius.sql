CREATE TABLE "appointments" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"lead_name" text NOT NULL,
	"phone" text NOT NULL,
	"slot" text NOT NULL,
	"issue_summary" text NOT NULL,
	"agent" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"need" text NOT NULL,
	"source" text NOT NULL,
	"status" text NOT NULL,
	"created_at" text NOT NULL,
	"last_contact_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"customer_name" text NOT NULL,
	"phone" text NOT NULL,
	"job_type" text NOT NULL,
	"line_items" jsonb NOT NULL,
	"total" integer NOT NULL,
	"notes" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "appointments_business_id_idx" ON "appointments" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "leads_business_id_idx" ON "leads" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "quotes_business_id_idx" ON "quotes" USING btree ("business_id");