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
