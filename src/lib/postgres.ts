import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Lazily-created singleton so importing this module (or anything that
// imports it) never touches the network or throws — only an actual query
// does. That matters because src/lib/agents/configs/store.ts falls back to
// static config data when this throws (see store.ts), and other pages
// (e.g. the homepage) never need a DB at all.
let client: postgres.Sql | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to web/.env.local (see .env.local.example) — use Supabase's " +
        "'Transaction pooler' connection string, not the direct connection.",
    );
  }

  // `prepare: false` is required for Supabase's transaction-mode pgbouncer
  // pooler, which doesn't support prepared statements across pooled
  // connections.
  client = postgres(url, { prepare: false });
  dbInstance = drizzle(client, { schema });
  return dbInstance;
}
