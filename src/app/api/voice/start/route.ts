import { NextRequest, NextResponse } from "next/server";
import { addLead } from "@/lib/crm";
import { DEFAULT_BUSINESS_ID } from "@/lib/agents/configs";
import { getFromNumber, getPublicBaseUrl, getTwilioClient, publicUrl, TWILIO_MISSING_CONFIG_ERROR } from "@/lib/twilio";
import type { LeadIntake } from "@/lib/agents/olaAgent";
import { limitVoiceRequest } from "@/lib/rateLimit";

// The real-phone-call path stays single-tenant for now (not wired to the
// business switcher — see docs/tech-stack-roadmap.md "Multi-tenant CRM data"
// scope boundaries), so every voice-originated lead is filed under the
// default business.

export const runtime = "nodejs";

// Triggered by the "call me" button on the speed-to-lead demo. Places a REAL
// outbound phone call via Twilio, i.e. it spends money and dials a stranger's
// number — so unlike the chat routes it is guarded twice:
//  1. Rate limits: per-IP hourly and a hard global daily cap (lib/rateLimit).
//  2. A demo PIN: VOICE_DEMO_PIN must be set in web/.env.local and the
//     request must present it. No PIN configured -> the feature is off.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const lead: LeadIntake = body.lead;
  const pin: string = typeof body.pin === "string" ? body.pin : "";

  const configuredPin = process.env.VOICE_DEMO_PIN;
  if (!configuredPin) {
    return NextResponse.json(
      { error: "Real calls are disabled. Set VOICE_DEMO_PIN in web/.env.local to enable them." },
      { status: 503 },
    );
  }
  if (pin !== configuredPin) {
    return NextResponse.json({ error: "PIN required.", pinRequired: true }, { status: 401 });
  }

  const limit = limitVoiceRequest(req);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Call limit reached — try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const client = getTwilioClient();
  const fromNumber = getFromNumber();
  const baseUrl = getPublicBaseUrl();
  if (!client || !fromNumber || !baseUrl) {
    return NextResponse.json({ error: TWILIO_MISSING_CONFIG_ERROR }, { status: 500 });
  }

  const leadRecord = await addLead(DEFAULT_BUSINESS_ID, {
    name: lead.name,
    phone: lead.phone,
    need: lead.need,
    source: "speed-to-lead",
    status: "new",
  });

  const twimlUrl = publicUrl(
    `/api/voice/twiml?leadId=${encodeURIComponent(leadRecord.id)}&name=${encodeURIComponent(
      lead.name,
    )}&phone=${encodeURIComponent(lead.phone)}&need=${encodeURIComponent(lead.need)}`,
  );

  try {
    const call = await client.calls.create({
      to: lead.phone,
      from: fromNumber,
      url: twimlUrl,
      method: "POST",
    });
    return NextResponse.json({ leadId: leadRecord.id, callSid: call.sid });
  } catch (err) {
    return NextResponse.json(
      { error: `Nie udało się zainicjować połączenia: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
