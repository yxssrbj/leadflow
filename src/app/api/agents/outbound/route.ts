import { NextRequest, NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { getClient, MODEL, clientError } from "@/lib/anthropic";
import { addAppointment, getLead, updateLead } from "@/lib/crm";
import { nextBusinessSlots } from "@/lib/db";
import { getBusinessConfig } from "@/lib/agents/configs";
import { buildOutboundPrompt } from "@/lib/agents/prompts/outbound";
import { bookAppointmentToolMinimal, closeLeadTool } from "@/lib/agents/tools";
import type { Language } from "@/lib/agents/types";
import type { ChatMessage } from "@/lib/types";
import { limitAgentRequest, RATE_LIMIT_MESSAGE } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const leadId: string = body.leadId;
  const history: ChatMessage[] = body.history ?? [];
  const language: Language = body.language === "en" ? "en" : "pl";
  const businessId: string | undefined = body.businessId;

  const limit = limitAgentRequest(req);
  if (!limit.ok) {
    return NextResponse.json(
      { error: RATE_LIMIT_MESSAGE[language] },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const client = await getClient();
  if (!client) {
    return NextResponse.json({ error: clientError() }, { status: 500 });
  }

  const config = await getBusinessConfig(businessId);
  const persona = config.agents.outbound;

  const lead = await getLead(config.id, leadId);
  if (!lead) {
    return NextResponse.json(
      { error: language === "en" ? "Lead not found." : "Nie znaleziono leada." },
      { status: 404 },
    );
  }

  // The CRM re-engagement trigger is always the first user turn, so the
  // sequence starts with `user` on every request.
  const kickoff: Anthropic.MessageParam = {
    role: "user",
    content:
      language === "en"
        ? `[CRM signal] This dormant lead just came up for re-engagement. Send the first message in English as ${persona.name} would.`
        : `[Sygnał z CRM] Ten uśpiony lead właśnie trafił do ponownego kontaktu. Wyślij pierwszą wiadomość po polsku jako ${persona.name}.`,
  };
  const messages: Anthropic.MessageParam[] = [
    kickoff,
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  const slots = nextBusinessSlots(language);
  const response = await client.messages.create({
    model: config.model?.outbound?.model ?? MODEL,
    max_tokens: config.model?.outbound?.maxTokens ?? 400,
    system: buildOutboundPrompt(config, language, lead, slots),
    tools: [bookAppointmentToolMinimal(language, config.appointmentLabel), closeLeadTool(language)],
    messages,
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const toolBlock = response.content.find((b) => b.type === "tool_use");

  let booking = null;
  let closed = null;
  if (toolBlock && toolBlock.type === "tool_use") {
    if (toolBlock.name === "book_appointment") {
      const input = toolBlock.input as { slot: string; issue_summary: string };
      await addAppointment(config.id, {
        leadName: lead.name,
        phone: lead.phone,
        slot: input.slot,
        issueSummary: input.issue_summary,
        agent: "outbound",
      });
      await updateLead(config.id, lead.id, { status: "revived" });
      booking = { ...input, name: lead.name, phone: lead.phone };
    } else if (toolBlock.name === "close_lead") {
      const input = toolBlock.input as { reason: string };
      await updateLead(config.id, lead.id, { status: "closed" });
      closed = input;
    }
  }

  return NextResponse.json({
    reply: textBlock && textBlock.type === "text" ? textBlock.text : "",
    booking,
    closed,
  });
}
