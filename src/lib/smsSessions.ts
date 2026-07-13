import type { LeadIntake } from "@/lib/agents/olaAgent";
import type { Language } from "@/lib/agents/types";
import type { ChatMessage } from "@/lib/types";

// Twilio inbound-SMS webhooks are stateless HTTP requests, so the
// conversation history for a live SMS thread has to live somewhere between
// requests — same situation as lib/callSessions.ts, and the same answer:
// in-memory is fine for a single-dev-instance demo; a multi-instance
// deployment would need a shared store (e.g. Redis) instead.
//
// Keyed by the lead's phone number (Twilio's `From` on inbound messages),
// because that's the only identity an SMS reply carries. Unlike a phone
// call, an SMS thread can idle for hours between replies, so entries expire
// after 24h (swept lazily on writes) rather than living until process exit.
export interface SmsSession {
  leadId: string;
  lead: LeadIntake;
  history: ChatMessage[];
  language: Language;
  expiresAt: number;
}

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

const sessions = new Map<string, SmsSession>();

// Twilio always sends E.164 (+48123456789), but the demo form's phone field
// is free text ("+48 512 044 780") — normalize both sides so they meet.
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().]/g, "");
}

function sweepExpired(now: number): void {
  for (const [key, session] of sessions) {
    if (now >= session.expiresAt) sessions.delete(key);
  }
}

export function createSmsSession(
  phone: string,
  leadId: string,
  lead: LeadIntake,
  language: Language,
): SmsSession {
  const now = Date.now();
  sweepExpired(now);
  const session: SmsSession = { leadId, lead, history: [], language, expiresAt: now + SESSION_TTL_MS };
  sessions.set(normalizePhone(phone), session);
  return session;
}

export function getSmsSession(phone: string): SmsSession | undefined {
  const session = sessions.get(normalizePhone(phone));
  if (!session) return undefined;
  if (Date.now() >= session.expiresAt) {
    sessions.delete(normalizePhone(phone));
    return undefined;
  }
  return session;
}

export function deleteSmsSession(phone: string): void {
  sessions.delete(normalizePhone(phone));
}
