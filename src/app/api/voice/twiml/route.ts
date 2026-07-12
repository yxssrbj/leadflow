import { NextRequest, NextResponse } from "next/server";
import Twilio from "twilio";
import { getClient } from "@/lib/anthropic";
import { getOlaReply, type LeadIntake } from "@/lib/agents/olaAgent";
import { createCallSession } from "@/lib/callSessions";
import { getTwilioVoiceConfig, getVoiceCallLang, kokoroAudioUrl, publicUrl, shouldUseKokoro } from "@/lib/twilio";

export const runtime = "nodejs";

// Twilio POSTs here the moment the call connects (form-encoded body with
// CallSid etc.; our own query params carry the lead info from /api/voice/start).
export async function POST(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const leadId = params.get("leadId") ?? "";
  const lead: LeadIntake = {
    name: params.get("name") ?? "",
    phone: params.get("phone") ?? "",
    need: params.get("need") ?? "",
  };

  const form = await req.formData();
  const callSid = String(form.get("CallSid") ?? "");

  const session = createCallSession(callSid, leadId, lead);

  const lang = getVoiceCallLang();
  const { language, voice } = getTwilioVoiceConfig(lang);
  const useKokoro = shouldUseKokoro(lang);

  const VoiceResponse = Twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  const client = await getClient();
  if (!client) {
    twiml.say(
      { language },
      lang === "en" ? "Sorry, we hit a technical problem. Goodbye." : "Przepraszamy, wystąpił problem techniczny. Do usłyszenia.",
    );
    twiml.hangup();
    return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
  }

  const { reply } = await getOlaReply(client, lead, [], lang, undefined, "call");
  session.history.push({ role: "assistant", content: reply });

  const gather = twiml.gather({
    input: ["speech"],
    language,
    speechTimeout: "auto",
    action: publicUrl(`/api/voice/twiml/gather?leadId=${encodeURIComponent(leadId)}`),
    method: "POST",
  });
  if (useKokoro) {
    gather.play(kokoroAudioUrl(reply));
  } else {
    gather.say({ language, voice }, reply);
  }

  // Reached only if <Gather> times out with no speech detected.
  twiml.say(
    { language },
    lang === "en" ? "I didn't catch a reply. Thanks for your time, goodbye." : "Nie usłyszałam odpowiedzi. Dziękuję za rozmowę, do usłyszenia.",
  );
  twiml.hangup();

  return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
}
