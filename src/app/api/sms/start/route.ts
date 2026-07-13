import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/anthropic";
import { getOlaReply, type LeadIntake } from "@/lib/agents/olaAgent";
import { addLead } from "@/lib/crm";
import { DEFAULT_BUSINESS_ID } from "@/lib/agents/configs";
import { createSmsSession } from "@/lib/smsSessions";
import { getFromNumber, getTwilioClient, prepareSmsBody, TWILIO_MISSING_CONFIG_ERROR } from "@/lib/twilio";
import { limitSmsRequest } from "@/lib/rateLimit";
import type { Language } from "@/lib/agents/types";

// Like the voice path, the real-SMS path stays single-tenant for now —
// every SMS-originated lead is filed under the default business (see
// docs/tech-stack-roadmap.md scope boundaries).

export const runtime = "nodejs";

// Triggered by the "text me for real" button on the speed-to-lead demo.
// Sends a REAL text message via Twilio — costs money and messages a
// stranger's phone — so it's guarded exactly like /api/voice/start:
//  1. VOICE_DEMO_PIN (shared gate for both real channels; unset = off).
//  2. Rate limits: per-IP hourly and a hard global daily cap.
// The lead's replies arrive at /api/sms/inbound (Twilio webhook), which
// continues the conversation from the session created here.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const lead: LeadIntake = body.lead;
  const pin: string = typeof body.pin === "string" ? body.pin : "";
  const language: Language = body.language === "en" ? "en" : "pl";

  const configuredPin = process.env.VOICE_DEMO_PIN;
  if (!configuredPin) {
    return NextResponse.json(
      { error: "Real SMS is disabled. Set VOICE_DEMO_PIN in web/.env.local to enable it." },
      { status: 503 },
    );
  }
  if (pin !== configuredPin) {
    return NextResponse.json({ error: "PIN required.", pinRequired: true }, { status: 401 });
  }

  const limit = limitSmsRequest(req);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "SMS limit reached — try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const twilio = getTwilioClient();
  const fromNumber = getFromNumber();
  if (!twilio || !fromNumber) {
    return NextResponse.json({ error: TWILIO_MISSING_CONFIG_ERROR }, { status: 500 });
  }

  const agent = await getClient();
  if (!agent) {
    return NextResponse.json({ error: "Agent provider is not configured." }, { status: 500 });
  }

  const leadRecord = await addLead(DEFAULT_BUSINESS_ID, {
    name: lead.name,
    phone: lead.phone,
    need: lead.need,
    source: "speed-to-lead",
    status: "new",
  });

  const { reply } = await getOlaReply(agent, lead, [], language, undefined, "sms");
  if (!reply) {
    return NextResponse.json({ error: "Agent returned an empty reply." }, { status: 500 });
  }

  try {
    const message = await twilio.messages.create({ to: lead.phone, from: fromNumber, body: prepareSmsBody(reply) });
    const session = createSmsSession(lead.phone, leadRecord.id, lead, language);
    session.history.push({ role: "assistant", content: reply });
    return NextResponse.json({ leadId: leadRecord.id, messageSid: message.sid });
  } catch (err) {
    return NextResponse.json(
      { error: `Nie udało się wysłać SMS-a: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
