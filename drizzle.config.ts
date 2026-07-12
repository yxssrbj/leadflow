import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs as a standalone Node process (via `npm run db:*`), so it
// never gets Next.js's automatic .env.local loading the way `next dev`/
// `next build` do. @next/env is the package Next uses internally for this —
// same precedence (.env.local > .env.development/.env.production > .env) as
// the app itself. See "Loading Environment Variables with @next/env" in the
// Next.js docs.
loadEnvConfig(process.cwd());

// drizzle-kit needs a direct (non-pooled) connection for migrations —
// Supabase's pooler doesn't support the session-level commands drizzle-kit
// issues. Use the "Session pooler" or direct connection string here even if
// DATABASE_URL (used by the app at runtime, see lib/postgres.ts) is the
// transaction pooler. Falls back to DATABASE_URL if a dedicated one isn't set.
export default defineConfig({
  schema: "./src/lib/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL || "",
  },
});
