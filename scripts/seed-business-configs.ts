// Idempotent seed: inserts (or updates, if already present) the two configs
// that used to be the entire REGISTRY — solartech and budmax-remont — as
// rows in the business_configs table. Run once after migrating:
//
//   npm run db:generate && npm run db:migrate && npm run db:seed
//
// Safe to re-run: uses the same upsert path the admin UI uses, so re-running
// this after editing solartech.ts/budmax-remont.ts will push those edits to
// the DB (handy for local dev — NOT how you'd manage a real client, which
// should be edited via /admin/businesses instead).
import { loadEnvConfig } from "@next/env";
import { solartech } from "@/lib/agents/configs/solartech";
import { budmaxRemont } from "@/lib/agents/configs/budmax-remont";
import { upsertBusinessConfig } from "@/lib/agents/configs/store";

// Standalone script (run via `tsx`, not `next dev`/`next build`) — needs
// @next/env to pick up web/.env.local the same way drizzle.config.ts does.
// Safe to call after the imports above: lib/postgres.ts's getDb() is lazy
// and only reads DATABASE_URL when actually queried, not at import time.
loadEnvConfig(process.cwd());

async function main() {
  for (const config of [solartech, budmaxRemont]) {
    await upsertBusinessConfig(config);
    console.log(`seeded: ${config.id}`);
  }
  console.log("done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("seed failed:", err);
  process.exit(1);
});
