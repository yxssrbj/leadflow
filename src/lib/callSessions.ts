import type { LeadIntake } from "@/lib/agents/olaAgent";
import type { ChatMessage } from "@/lib/types";

// Twilio webhooks are stateless HTTP requests, so the conversation history for
// a live phone call has to live somewhere between requests. In-memory is fine
// for a single-dev-instance demo — a real deployment with multiple server
// instances would need a shared store (e.g. Redis) instead.
export interface CallSession {
  leadId: string;
  lead: LeadIntake;
  history: ChatMessage[];
}

const sessions = new Map<string, CallSession>();

export function createCallSession(callSid: string, leadId: string, lead: LeadIntake): CallSession {
  const session: CallSession = { leadId, lead, history: [] };
  sessions.set(callSid, session);
  return session;
}

export function getCallSession(callSid: string): CallSession | undefined {
  return sessions.get(callSid);
}

export function deleteCallSession(callSid: string): void {
  sessions.delete(callSid);
}
