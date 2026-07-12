CREATE TABLE "business_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"business_name" text NOT NULL,
	"city" text NOT NULL,
	"vertical" text NOT NULL,
	"services" text NOT NULL,
	"appointment_label" text NOT NULL,
	"subsidy_note" text DEFAULT '' NOT NULL,
	"qualifying_questions" jsonb NOT NULL,
	"pricing_guide_pl" text NOT NULL,
	"pricing_guide_en" text NOT NULL,
	"agents" jsonb NOT NULL,
	"model_overrides" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
