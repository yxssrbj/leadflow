ALTER TABLE "business_configs" ADD COLUMN "owner_user_id" text;--> statement-breakpoint
ALTER TABLE "business_configs" ADD CONSTRAINT "business_configs_owner_user_id_unique" UNIQUE("owner_user_id");