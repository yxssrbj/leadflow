import { cache } from "react";
import { eq } from "drizzle-orm";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/postgres";
import { businessConfigs } from "@/lib/schema";

// Real per-client auth for /dashboard (see docs/tech-stack-roadmap.md
// "Auth") — replaces the old `?business=<id>` query param entirely. A
// logged-in user owns exactly one business (business_configs.owner_user_id,
// see schema.ts), resolved here instead of trusted from the client.

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// cache() dedupes this within one request — the dashboard layout and
// whichever page it wraps both call this independently (same pattern the
// pages already used for getDictionary/searchParams before this change),
// so without cache() every dashboard request would do it twice.
export const getSessionBusinessId = cache(async function getSessionBusinessId(): Promise<{
  businessId: string;
  businessName: string;
} | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const [row] = await getDb()
    .select({ id: businessConfigs.id, businessName: businessConfigs.businessName })
    .from(businessConfigs)
    .where(eq(businessConfigs.ownerUserId, user.id))
    .limit(1);

  if (!row) return null;
  return { businessId: row.id, businessName: row.businessName };
});
