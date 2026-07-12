import { NextRequest, NextResponse } from "next/server";
import { getClient, clientError } from "@/lib/anthropic";
import { addAppointment, addLead, updateLead } from "@/lib/crm";
import { getOlaReply, type LeadIntake } from "@/lib/agents/olaAgent";
import { getBusinessConfig } from "@/lib/agents/configs";
import type { Language } from "@/lib/agents/types";
import type { ChatMessage } from "@/lib/types";
import { limitAgentRequest, RATE_LIMIT_MESSAGE } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const lead: LeadIntake = body.lead;
  const history: ChatMessage[] = body.history ?? [];
  const language: Language = body.language === "en" ? "en" : "pl";
  const businessId: string | undefined = body.businessId;
  let leadId: string | undefined = body.leadId;

  const limit = limitAgentRequest(req);
  if (!limit.ok) {
    return NextResponse.json(
      { error: RATE_LIMIT_MESSAGE[language] },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const client = await getClient();
  if (!client) {
    return NextResponse.json({ error: clientError() }, { status: 500 });
  }

  // Resolved once here so CRM records always land under a business that
  // genuinely exists — getOlaReply resolves the same config internally
  // (warm cache, see lib/agents/configs/store.ts) rather than trusting the
  // raw, possibly-unregistered businessId from the request body.
  const { id: resolvedBusinessId } = await getBusinessConfig(businessId);

  if (!leadId) {
    leadId = (
      await addLead(resolvedBusinessId, {
        name: lead.name,
        phone: lead.phone,
        need: lead.need,
        source: "speed-to-lead",
        status: "new",
      })
    ).id;
  }

  const { reply, booking } = await getOlaReply(client, lead, history, language, businessId);

  if (booking) {
    await addAppointment(resolvedBusinessId, {
      leadName: booking.name,
      phone: booking.phone,
      slot: booking.slot,
      issueSummary: booking.issue_summary,
      agent: "speed-to-lead",
    });
    await updateLead(resolvedBusinessId, leadId, { status: "booked" });
  } else if (history.length >= 2) {
    await updateLead(resolvedBusinessId, leadId, { status: "qualified" });
  }

  return NextResponse.json({ reply, booking, leadId });
}
