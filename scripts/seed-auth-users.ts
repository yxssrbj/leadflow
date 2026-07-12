// Creates one Supabase Auth login per demo business (solartech,
// budmax-remont) and links it via business_configs.owner_user_id — see
// docs/tech-stack-roadmap.md "Auth". Run after seed-business-configs.ts:
//
//   npm run db:seed
//
// Uses the Admin API (service role key, never exposed to the client) so
// `email_confirm: true` can skip email delivery entirely — no SMTP setup
// needed for these two internal demo accounts. Idempotent: re-running skips
// account creation for an email that already exists (passwords aren't
// regenerated) and just re-links the business row, which matters since a
// generated password is only ever shown once, in this script's own output.
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { getDb } from "@/lib/postgres";
import { businessConfigs } from "@/lib/schema";

loadEnvConfig(process.cwd());

const ACCOUNTS = [
  { businessId: "solartech", email: "solartech@leadflowai.demo" },
  { businessId: "budmax-remont", email: "budmax@leadflowai.demo" },
];

function generatePassword(): string {
  return randomBytes(12).toString("base64url");
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in web/.env.local " +
        "(Supabase dashboard → Project Settings → API).",
    );
  }

  const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const db = getDb();

  for (const { businessId, email } of ACCOUNTS) {
    let userId: string;
    const password = generatePassword();

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createErr) {
      if (!createErr.message.toLowerCase().includes("already been registered")) {
        throw new Error(`createUser(${email}) failed: ${createErr.message}`);
      }
      const { data: list, error: listErr } = await admin.auth.admin.listUsers();
      if (listErr) throw new Error(`listUsers() failed while resolving ${email}: ${listErr.message}`);
      const existing = list.users.find((u) => u.email === email);
      if (!existing) throw new Error(`${email} reported as already registered but not found via listUsers()`);
      userId = existing.id;
      console.log(`${businessId}: account already exists (${email}) — linking only, password unchanged.`);
    } else {
      userId = created.user.id;
      console.log(`${businessId}: created ${email} / ${password}`);
    }

    await db.update(businessConfigs).set({ ownerUserId: userId }).where(eq(businessConfigs.id, businessId));
  }

  console.log("done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("seed-auth-users failed:", err);
  process.exit(1);
});
