import type Anthropic from "@anthropic-ai/sdk";
import { MODEL } from "@/lib/anthropic";
import type { AgentClient } from "@/lib/anthropic";
import { nextBusinessSlots } from "@/lib/db";
import type { ChatMessage } from "@/lib/types";
import { getBusinessConfig } from "./configs";
import { buildSpeedToLeadPrompt } from "./prompts/speedToLead";
import { bookAppointmentTool } from "./tools";
import type { Language } from "./types";

// Orchestrates the speed-to-lead / intake agent (Ola in the default
// SolarTech config). Shared by both the text-chat demo
// (src/app/api/agents/speed-to-lead) and the real phone-call flow
// (src/app/api/voice/*) so the agent behaves identically whether the lead is
// typing or actually talking to it. The system prompt itself now lives in
// prompts/speedToLead.ts and is driven entirely by a BusinessConfig — see
// docs/agent-templates.md.
export type OlaLanguage = Language;

export interface LeadIntake {
  name: string;
  phone: string;
  need: string;
}

export interface OlaBooking {
  slot: string;
  name: string;
  phone: string;
  issue_summary: string;
}

export interface OlaReplyResult {
  reply: string;
  booking: OlaBooking | null;
}

export async function getOlaReply(
  client: AgentClient,
  lead: LeadIntake,
  history: ChatMessage[],
  language: Language = "pl",
  businessId?: string,
  medium: "text" | "call" | "sms" = "text",
): Promise<OlaReplyResult> {
  const config = await getBusinessConfig(businessId);
  const persona = config.agents.speedToLead;

  // The lead's original form submission is always the first user turn, so the
  // model keeps that context every turn and the sequence starts with `user`.
  const intake: Anthropic.MessageParam = {
    role: "user",
    content:
      language === "en"
        ? `[Web form submission]\nName: ${lead.name}\nPhone: ${lead.phone}\nWhat they need: ${lead.need}\n\n(This is the system triggering your first outreach — reply in English as ${persona.name} would.)`
        : `[Zgłoszenie z formularza na stronie]\nImię i nazwisko: ${lead.name}\nTelefon: ${lead.phone}\nCzego potrzebuje: ${lead.need}\n\n(To jest pierwszy sygnał od systemu — odpisz po polsku jako ${persona.name}.)`,
  };
  const messages: Anthropic.MessageParam[] = [
    intake,
    ...history.map((m) => ({ role: m.role, content: m.content }) as Anthropic.MessageParam),
  ];

  const slots = nextBusinessSlots(language);
  const response = await client.messages.create({
    model: config.model?.speedToLead?.model ?? MODEL,
    max_tokens: config.model?.speedToLead?.maxTokens ?? 400,
    system: buildSpeedToLeadPrompt(config, language, slots, medium),
    tools: [bookAppointmentTool(language, config.appointmentLabel)],
    messages,
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const toolBlock = response.content.find((b) => b.type === "tool_use");

  let booking: OlaBooking | null = null;
  if (toolBlock && toolBlock.type === "tool_use") {
    booking = toolBlock.input as OlaBooking;
  }

  return {
    reply: textBlock && textBlock.type === "text" ? textBlock.text : "",
    booking,
  };
}
