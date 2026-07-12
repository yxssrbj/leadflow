import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// The one table this migration introduces: BusinessConfig (see
// src/lib/agents/types.ts), previously hardcoded per-client TypeScript
// files under src/lib/agents/configs/. See docs/tech-stack-roadmap.md
// "Multi-tenant config" and docs/agent-templates.md for the onboarding flow
// this enables.
export const businessConfigs = pgTable("business_configs", {
  // Matches BusinessConfig.id — also the ?business=<id> demo query param
  // and the primary key, so ids should stay short, url-safe slugs.
  id: text("id").primaryKey(),
  businessName: text("business_name").notNull(),
  city: text("city").notNull(),
  vertical: text("vertical").notNull(),
  services: text("services").notNull(),
  appointmentLabel: text("appointment_label").notNull(),
  subsidyNote: text("subsidy_note").notNull().default(""),

  // string[] — the intake agents' qualifying questions, in order.
  qualifyingQuestions: jsonb("qualifying_questions").notNull().$type<string[]>(),

  // Must be pre-written in both languages — copied close to verbatim into
  // the quotation agent's tool-call output. See BusinessConfig.pricingGuide.
  pricingGuidePl: text("pricing_guide_pl").notNull(),
  pricingGuideEn: text("pricing_guide_en").notNull(),

  // { speedToLead: {name, role}, quotation: {...}, outbound: {...} }
  agents: jsonb("agents").notNull().$type<{
    speedToLead: { name: string; role: string };
    quotation: { name: string; role: string };
    outbound: { name: string; role: string };
  }>(),

  // Optional per-agent model/maxTokens overrides — BusinessConfig["model"].
  modelOverrides: jsonb("model_overrides").$type<{
    speedToLead?: { model?: string; maxTokens?: number };
    quotation?: { model?: string; maxTokens?: number };
    outbound?: { model?: string; maxTokens?: number };
  } | null>(),

  // Soft reference (no FK, same rationale as leads/appointments/quotes'
  // businessId below) to a Supabase Auth user's id. Null until a real pilot
  // client is onboarded and given a login — see lib/auth.ts. Unique because
  // today's model is 1:1 (one login owns exactly one business); revisit if
  // an agency-wide account that can view multiple businesses is ever needed.
  ownerUserId: text("owner_user_id").unique(),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BusinessConfigRow = typeof businessConfigs.$inferSelect;
export type NewBusinessConfigRow = typeof businessConfigs.$inferInsert;

// CRM data (leads/appointments/quotes) — see src/lib/crm.ts and
// docs/tech-stack-roadmap.md "Multi-tenant CRM data". `businessId` is a soft
// reference (no FK) to businessConfigs.id, consistent with the
// graceful-degradation philosophy in configs/store.ts: the two migrations'
// failure modes stay decoupled. createdAt/lastContactAt are stored as
// ISO-8601 TEXT, not native timestamp — the app's types (Lead.createdAt:
// string) and format.ts already assume a string everywhere, and ISO-8601
// text sorts identically to chronological order, so `orderBy(desc(...))`
// matches today's `localeCompare` sort with no other code changes needed.

export const leads = pgTable(
  "leads",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id").notNull(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    need: text("need").notNull(),
    source: text("source").notNull().$type<"speed-to-lead" | "quotation" | "outbound" | "crm-import">(),
    status: text("status")
      .notNull()
      .$type<"new" | "qualified" | "booked" | "quoted" | "dead" | "revived" | "closed">(),
    createdAt: text("created_at").notNull(),
    lastContactAt: text("last_contact_at").notNull(),
  },
  (t) => [index("leads_business_id_idx").on(t.businessId)],
);

export const appointments = pgTable(
  "appointments",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id").notNull(),
    leadName: text("lead_name").notNull(),
    phone: text("phone").notNull(),
    slot: text("slot").notNull(),
    issueSummary: text("issue_summary").notNull(),
    agent: text("agent").notNull().$type<"speed-to-lead" | "quotation" | "outbound">(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("appointments_business_id_idx").on(t.businessId)],
);

export const quotes = pgTable(
  "quotes",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id").notNull(),
    customerName: text("customer_name").notNull(),
    phone: text("phone").notNull(),
    jobType: text("job_type").notNull(),
    lineItems: jsonb("line_items").notNull().$type<{ description: string; amount: number }[]>(),
    total: integer("total").notNull(),
    notes: text("notes").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("quotes_business_id_idx").on(t.businessId)],
);

export type LeadRow = typeof leads.$inferSelect;
export type AppointmentRow = typeof appointments.$inferSelect;
export type QuoteRow = typeof quotes.$inferSelect;
