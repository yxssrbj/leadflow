import { NextRequest, NextResponse } from "next/server";
import { resetCrmData } from "@/lib/crm";
import { DEFAULT_BUSINESS_ID, isBusinessId } from "@/lib/agents/configs";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Restores one business's leads/appointments/quotes to the seeded state
// (keeps analytics events — see lib/db.ts). Intentionally unauthenticated:
// the worst a stranger can do is put a business's demo data back to its
// clean starting condition. Rate limited anyway so it can't be spammed into
// a delete/reinsert loop.
export async function POST(req: NextRequest) {
  const limit = rateLimit(`reset:${clientIp(req)}`, 5, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ ok: false }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  }

  const body = await req.json().catch(() => ({}));
  const businessParam = typeof body.businessId === "string" ? body.businessId : null;
  const businessId = businessParam && (await isBusinessId(businessParam)) ? businessParam : DEFAULT_BUSINESS_ID;

  await resetCrmData(businessId);
  return NextResponse.json({ ok: true });
}
