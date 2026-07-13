import Twilio from "twilio";

export function getTwilioClient(): Twilio.Twilio | null {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return Twilio(sid, token);
}

export function getFromNumber(): string | null {
  return process.env.TWILIO_PHONE_NUMBER || null;
}

// The base URL Twilio's servers must be able to reach — an ngrok tunnel while
// developing locally, or a real deployment URL in production.
export function getPublicBaseUrl(): string | null {
  const url = process.env.PUBLIC_BASE_URL;
  if (!url) return null;
  return url.replace(/\/$/, "");
}

export function publicUrl(path: string): string {
  const base = getPublicBaseUrl();
  return `${base ?? ""}${path.startsWith("/") ? path : `/${path}`}`;
}

export const TWILIO_MISSING_CONFIG_ERROR =
  "Brakuje konfiguracji Twilio. Ustaw TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER i PUBLIC_BASE_URL w web/.env.local, uruchom ngrok i zrestartuj serwer.";

// Twilio trial accounts reject messages over the single-segment limit
// (error 30044), and the trial prefix ("Sent from your Twilio trial
// account - ", ~38 chars) eats into the 160-GSM-char budget. Polish
// diacritics are the killer: one "ż" flips the whole message to UCS-2
// encoding (70 chars/segment). Writing Polish without diacritics is
// completely standard SMS practice in Poland, so this converts rather than
// mangles. The prompt also asks the model to stay short (see
// prompts/speedToLead.ts), making the hard truncation here a rarely-hit
// safety net — mostly for the scripted mock provider, which echoes the
// lead's whole form text back.
const SMS_BODY_MAX_CHARS = 120;

const POLISH_TO_GSM: Record<string, string> = {
  ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z",
  Ą: "A", Ć: "C", Ę: "E", Ł: "L", Ń: "N", Ó: "O", Ś: "S", Ź: "Z", Ż: "Z",
  "„": '"', "”": '"', "“": '"', "’": "'", "‘": "'", "—": "-", "–": "-", "…": "...",
};

export function prepareSmsBody(text: string): string {
  let out = text
    .replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ„”“’‘—–…]/g, (ch) => POLISH_TO_GSM[ch] ?? ch)
    .replace(/\s+/g, " ")
    .trim();
  if (out.length > SMS_BODY_MAX_CHARS) {
    const cut = out.slice(0, SMS_BODY_MAX_CHARS - 3);
    const lastSpace = cut.lastIndexOf(" ");
    out = `${cut.slice(0, lastSpace > 60 ? lastSpace : cut.length)}...`;
  }
  return out;
}

// Verifies that an inbound webhook request really came from Twilio, using
// the X-Twilio-Signature header (HMAC over the exact public URL + sorted
// POST params, keyed by the auth token). The voice webhooks skip this, but
// a forged inbound SMS would trigger a paid Claude call AND an outbound
// text to an attacker-chosen number, so the SMS webhook must not.
export function validateTwilioSignature(req: Request, path: string, params: Record<string, string>): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  const base = getPublicBaseUrl();
  if (!token || !base) return false;
  const signature = req.headers.get("x-twilio-signature") ?? "";
  // Gotcha discovered the hard way: Twilio signs webhooks with the account's
  // PRIMARY auth token only. A secondary/rotated token in TWILIO_AUTH_TOKEN
  // authenticates API calls just fine but fails every signature check here.
  return Twilio.validateRequest(token, signature, publicUrl(path), params);
}

// Language for the real-call flow only (VOICE_CALL_LANG=en|pl, default pl).
// The browser text-chat demo always stays Polish regardless of this setting.
export function getVoiceCallLang(): "pl" | "en" {
  return process.env.VOICE_CALL_LANG === "en" ? "en" : "pl";
}

// Narrow literal unions (not Twilio's own SayLanguage/GatherLanguage/SayVoice
// types) — a subset union like this is still assignable wherever Twilio's
// broader ones are expected, since "pl-PL" / "en-US" / "Polly.Ewa" /
// "Polly.Joanna" are members of both.
export type CallLanguageCode = "pl-PL" | "en-US";
export type CallVoiceName = "Polly.Ewa" | "Polly.Joanna";

export function getTwilioVoiceConfig(lang: "pl" | "en"): { language: CallLanguageCode; voice: CallVoiceName } {
  return lang === "en"
    ? { language: "en-US", voice: "Polly.Joanna" }
    : { language: "pl-PL", voice: "Polly.Ewa" };
}

// Kokoro genuinely supports English (unlike Polish — see olaAgent.ts), so it's
// used as Ola's real voice only in English-mode calls. Polish calls always
// stay on Twilio's built-in Polly voice, which pronounces Polish correctly.
export function shouldUseKokoro(lang: "pl" | "en"): boolean {
  return lang === "en";
}

export function kokoroAudioUrl(text: string): string {
  return publicUrl(`/api/voice/audio?text=${encodeURIComponent(text)}`);
}
