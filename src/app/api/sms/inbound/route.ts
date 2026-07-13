import { NextRequest, NextResponse } from "next/server";
import Twilio from "twilio";
import { getClient } from "@/lib/anthropic";
import { getOlaReply } from "@/lib/agents/olaAgent";
import { getSmsSession, deleteSmsSession } from "@/lib/smsSessions";
import { addAppointment, updateLead } from "@/lib/crm";
import { DEFAULT_BUSINESS_ID } from "@/lib/agents/configs";
import { prepareSmsBody, validateTwilioSignature } from "@/lib/twilio";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Twilio Messaging webhook ("A message comes in" on the phone number's
// Messaging configuration → {PUBLIC_BASE_URL}/api/sms/inbound, POST).
// Continues an SMS conversation started by /api/sms/start; the reply goes
// back in-band as TwiML so no extra API call is needed.
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    params[key] = String(value);
  }

  // Unlike the voice webhooks, this one validates X-Twilio-Signature: a
  // forged request here would trigger a paid Claude call and an outbound
  // text to an attacker-chosen number.
  if (!validateTwilioSignature(req, "/api/sms/inbound", params)) {
    return new NextResponse("invalid signature", { status: 403 });
  }

  const from = params.From ?? "";
  const text = (params.Body ?? "").trim();

  const emptyResponse = () =>
    new NextResponse(new Twilio.twiml.MessagingResponse().toString(), {
      headers: { "Content-Type": "text/xml" },
    });

  // A lead-side runaway (or someone spamming the number) shouldn't be able
  // to burn Claude credit — cap turns per phone, then go silent.
  const flood = rateLimit(`sms:phone:${from}`, 10, 60 * 60_000);
  if (!flood.ok) return emptyResponse();

  // No session = this sender never started a thread via the demo (or it
  // expired). Reply with nothing: strangers texting the number get silence,
  // which also costs nothing.
  const session = getSmsSession(from);
  if (!session || !text) return emptyResponse();

  const client = await getClient();
  if (!client) return emptyResponse();

  session.history.push({ role: "user", content: text });
  const { reply, booking } = await getOlaReply(client, session.lead, session.history, session.language, undefined, "sms");
  session.history.push({ role: "assistant", content: reply });

  if (booking) {
    await addAppointment(DEFAULT_BUSINESS_ID, {
      leadName: booking.name,
      phone: booking.phone,
      slot: booking.slot,
      issueSummary: booking.issue_summary,
      agent: "speed-to-lead",
    });
    await updateLead(DEFAULT_BUSINESS_ID, session.leadId, { status: "booked" });
    deleteSmsSession(from);
  } else if (session.history.filter((m) => m.role === "assistant").length >= 2) {
    await updateLead(DEFAULT_BUSINESS_ID, session.leadId, { status: "qualified" });
  }

  const twiml = new Twilio.twiml.MessagingResponse();
  if (reply) twiml.message(prepareSmsBody(reply));
  return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
}
