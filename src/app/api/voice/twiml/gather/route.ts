import { NextRequest, NextResponse } from "next/server";
import Twilio from "twilio";
import { getClient } from "@/lib/anthropic";
import { getOlaReply } from "@/lib/agents/olaAgent";
import { getCallSession, deleteCallSession } from "@/lib/callSessions";
import { addAppointment, updateLead } from "@/lib/crm";
import { DEFAULT_BUSINESS_ID } from "@/lib/agents/configs";
import { getTwilioVoiceConfig, getVoiceCallLang, kokoroAudioUrl, publicUrl, shouldUseKokoro } from "@/lib/twilio";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const leadId = req.nextUrl.searchParams.get("leadId") ?? "";
  const form = await req.formData();
  const callSid = String(form.get("CallSid") ?? "");
  const speechResult = String(form.get("SpeechResult") ?? "").trim();

  const lang = getVoiceCallLang();
  const { language, voice } = getTwilioVoiceConfig(lang);
  const useKokoro = shouldUseKokoro(lang);

  const VoiceResponse = Twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  const replyAndHangup = (text: string) => {
    if (useKokoro) {
      twiml.play(kokoroAudioUrl(text));
    } else {
      twiml.say({ language, voice }, text);
    }
    twiml.hangup();
  };

  const session = getCallSession(callSid);
  if (!session) {
    replyAndHangup(
      lang === "en" ? "Sorry, something went wrong with this call. Goodbye." : "Przepraszam, coś poszło nie tak z tym połączeniem. Do usłyszenia.",
    );
    return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
  }

  const gatherAgain = () =>
    twiml.gather({
      input: ["speech"],
      language,
      speechTimeout: "auto",
      action: publicUrl(`/api/voice/twiml/gather?leadId=${encodeURIComponent(leadId)}`),
      method: "POST",
    });

  if (!speechResult) {
    const retryText =
      lang === "en" ? "Sorry, I didn't catch that. Could you say that again?" : "Przepraszam, nie usłyszałam. Może Pan lub Pani powtórzyć?";
    const gather = gatherAgain();
    if (useKokoro) {
      gather.play(kokoroAudioUrl(retryText));
    } else {
      gather.say({ language, voice }, retryText);
    }
    twiml.say({ language }, lang === "en" ? "Thanks for your time, goodbye." : "Do usłyszenia, dziękuję za rozmowę.");
    twiml.hangup();
    return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
  }

  session.history.push({ role: "user", content: speechResult });

  const client = await getClient();
  if (!client) {
    replyAndHangup(lang === "en" ? "Sorry, we hit a technical problem." : "Przepraszamy, wystąpił problem techniczny.");
    return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
  }

  const { reply, booking } = await getOlaReply(client, session.lead, session.history, lang, undefined, "call");
  session.history.push({ role: "assistant", content: reply });

  if (booking) {
    await addAppointment(DEFAULT_BUSINESS_ID, {
      leadName: booking.name,
      phone: booking.phone,
      slot: booking.slot,
      issueSummary: booking.issue_summary,
      agent: "speed-to-lead",
    });
    await updateLead(DEFAULT_BUSINESS_ID, leadId, { status: "booked" });
    replyAndHangup(reply);
    deleteCallSession(callSid);
  } else {
    if (session.history.filter((m) => m.role === "assistant").length >= 2) {
      await updateLead(DEFAULT_BUSINESS_ID, leadId, { status: "qualified" });
    }
    const gather = gatherAgain();
    if (useKokoro) {
      gather.play(kokoroAudioUrl(reply));
    } else {
      gather.say({ language, voice }, reply);
    }
    twiml.say({ language }, lang === "en" ? "Thanks for your time, goodbye." : "Do usłyszenia, dziękuję za rozmowę.");
    twiml.hangup();
  }

  return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
}
