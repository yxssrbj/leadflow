// Idempotent-ish seed for the CRM tables (leads/appointments/quotes) — the
// same curated SolarTech Kraków demo narrative that used to live inline in
// lib/db.ts's seedData(), now the single source of truth in
// lib/crm.ts#curatedSeedFor(), reused by resetCrmData() too. Run as part of
// `npm run db:seed` (alongside seed-business-configs.ts).
//
// Re-running this after already seeding will duplicate rows (no upsert —
// each row gets a fresh randomUUID id every call). If you need to reseed
// cleanly, use the dashboard's "Reset demo data" button (calls
// resetCrmData(), which deletes-then-reseeds) instead of re-running this script.
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { getDb } from "@/lib/postgres";
import { appointments, leads, quotes } from "@/lib/schema";
import { curatedSeedFor } from "@/lib/crm";

async function main() {
  const seed = curatedSeedFor("solartech");
  const db = getDb();

  if (seed.leads.length) await db.insert(leads).values(seed.leads);
  if (seed.appointments.length) await db.insert(appointments).values(seed.appointments);
  if (seed.quotes.length) await db.insert(quotes).values(seed.quotes);

  console.log(
    `seeded: ${seed.leads.length} leads, ${seed.appointments.length} appointments, ${seed.quotes.length} quotes (solartech)`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("seed failed:", err);
  process.exit(1);
});
