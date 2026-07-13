import { NextRequest, NextResponse } from "next/server";
import { addEvent } from "@/lib/db";
import type { AnalyticsEventName } from "@/lib/types";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const ALLOWED_EVENTS: ReadonlySet<string> = new Set([
  "demo_opened",
  "tab_selected",
  "chat_turn",
  "booking_completed",
  "quote_completed",
  "lead_closed",
  "call_requested",
  "sms_requested",
] satisfies AnalyticsEventName[]);

// First-party, anonymous demo analytics. Fire-and-forget from the client
// (lib/analytics.ts); invalid or over-limit events are dropped silently —
// tracking must never break the demo itself.
export async function POST(req: NextRequest) {
  const limit = rateLimit(`track:${clientIp(req)}`, 60, 60_000);
  if (!limit.ok) return NextResponse.json({ ok: false }, { status: 429 });

  let body: { session?: unknown; name?: unknown; meta?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const session = typeof body.session === "string" ? body.session.slice(0, 64) : "";
  const name = typeof body.name === "string" ? body.name : "";
  if (!session || !ALLOWED_EVENTS.has(name)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let meta: Record<string, string> | undefined;
  if (body.meta && typeof body.meta === "object" && !Array.isArray(body.meta)) {
    meta = {};
    for (const [k, v] of Object.entries(body.meta as Record<string, unknown>).slice(0, 8)) {
      if (typeof v === "string") meta[k.slice(0, 32)] = v.slice(0, 120);
    }
  }

  addEvent({ session, name: name as AnalyticsEventName, meta });
  return NextResponse.json({ ok: true });
}
