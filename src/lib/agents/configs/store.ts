import { eq } from "drizzle-orm";
import { getDb } from "@/lib/postgres";
import { businessConfigs, type BusinessConfigRow, type NewBusinessConfigRow } from "@/lib/schema";
import type { BusinessConfig } from "../types";
import { solartech } from "./solartech";
import { budmaxRemont } from "./budmax-remont";
import { DEFAULT_BUSINESS_ID } from "./constants";

export { DEFAULT_BUSINESS_ID };

// The DB-backed implementation behind lib/agents/configs/index.ts's public
// API. Split into its own module so the resilience/caching logic here stays
// separate from the thin, stable public surface everything else imports.

// Every config ever hardcoded in this repo, keyed by id — used two ways:
//  1. As the seed data for `npm run db:seed` (see scripts/seed-business-configs.ts).
//  2. As an in-process fallback when the DB is unreachable or DATABASE_URL
//     isn't configured yet, so local dev and the live demo keep working
//     before/without Supabase set up, and survive a transient DB hiccup.
// A business created only through the admin UI has no fallback entry here —
// if the DB is down, requests for it fail loudly instead of silently, which
// is the right tradeoff (a config nobody hardcoded shouldn't pretend to exist).
const STATIC_FALLBACK: Record<string, BusinessConfig> = {
  [solartech.id]: solartech,
  [budmaxRemont.id]: budmaxRemont,
};


// Configs change rarely (an admin edit) but are read on every chat turn —
// a short TTL cache avoids a DB round trip per message. Same Map-based,
// single-instance-only pattern as lib/rateLimit.ts; swap for Redis/etc. if
// this ever runs across multiple instances with tight consistency needs.
const CACHE_TTL_MS = 30_000;
let cache: { configs: BusinessConfig[]; expiresAt: number } | null = null;

function rowToConfig(row: BusinessConfigRow): BusinessConfig {
  return {
    id: row.id,
    businessName: row.businessName,
    city: row.city,
    vertical: row.vertical,
    agents: row.agents,
    services: row.services,
    appointmentLabel: row.appointmentLabel,
    qualifyingQuestions: row.qualifyingQuestions,
    pricingGuide: { pl: row.pricingGuidePl, en: row.pricingGuideEn },
    subsidyNote: row.subsidyNote,
    model: row.modelOverrides ?? undefined,
  };
}

function configToRow(config: BusinessConfig): NewBusinessConfigRow {
  return {
    id: config.id,
    businessName: config.businessName,
    city: config.city,
    vertical: config.vertical,
    agents: config.agents,
    services: config.services,
    appointmentLabel: config.appointmentLabel,
    qualifyingQuestions: config.qualifyingQuestions,
    pricingGuidePl: config.pricingGuide.pl,
    pricingGuideEn: config.pricingGuide.en,
    subsidyNote: config.subsidyNote,
    modelOverrides: config.model ?? null,
    updatedAt: new Date(),
  };
}

async function loadAll(): Promise<BusinessConfig[]> {
  if (cache && cache.expiresAt > Date.now()) return cache.configs;

  try {
    const rows = await getDb().select().from(businessConfigs);
    const configs = rows.map(rowToConfig);
    cache = { configs, expiresAt: Date.now() + CACHE_TTL_MS };
    return configs;
  } catch (err) {
    console.error("[configs] DB read failed, using static fallback configs:", err);
    // Deliberately not cached: a transient failure should retry the DB on
    // the very next request rather than being stuck on stale/fallback data
    // for a full cache window.
    return Object.values(STATIC_FALLBACK);
  }
}

export async function getBusinessConfig(id?: string): Promise<BusinessConfig> {
  const configs = await loadAll();
  const match = id ? configs.find((c) => c.id === id) : undefined;
  if (match) return match;
  return configs.find((c) => c.id === DEFAULT_BUSINESS_ID) ?? STATIC_FALLBACK[DEFAULT_BUSINESS_ID];
}

export async function isBusinessId(id: string): Promise<boolean> {
  const configs = await loadAll();
  return configs.some((c) => c.id === id);
}

export async function listBusinessConfigs(): Promise<BusinessConfig[]> {
  return loadAll();
}

// --- Admin-only writes (called from app/[locale]/admin/businesses/actions.ts) ---

export async function upsertBusinessConfig(config: BusinessConfig): Promise<void> {
  const row = configToRow(config);
  await getDb()
    .insert(businessConfigs)
    .values(row)
    .onConflictDoUpdate({ target: businessConfigs.id, set: row });
  cache = null; // next read picks up the change immediately
}

export async function deleteBusinessConfig(id: string): Promise<void> {
  await getDb().delete(businessConfigs).where(eq(businessConfigs.id, id));
  cache = null;
}
