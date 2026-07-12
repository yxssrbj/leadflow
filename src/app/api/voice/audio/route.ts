import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const KOKORO_URL = process.env.KOKORO_URL || "http://localhost:8880";

// Serves Kokoro-generated speech audio for Twilio's <Play> verb during the
// real phone-call flow. English only — Kokoro has no Polish language support
// (see src/lib/agents/olaAgent.ts), so this is only ever reached when
// VOICE_CALL_LANG=en. Twilio's <Play> fetches this URL with a GET request.
export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get("text") ?? "";
  const voice = req.nextUrl.searchParams.get("voice") ?? "af_heart";
  if (!text.trim()) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  const res = await fetch(`${KOKORO_URL}/v1/audio/speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "kokoro",
      voice,
      input: text,
      response_format: "mp3",
      lang_code: "a",
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: `Kokoro TTS failed: ${res.status}` }, { status: 502 });
  }

  const audio = await res.arrayBuffer();
  return new NextResponse(audio, { headers: { "Content-Type": "audio/mpeg" } });
}
