import { NextRequest, NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { getClient, defaultModel, clientError } from "@/lib/anthropic";
import { addLead, addQuote } from "@/lib/crm";
import { getBusinessConfig } from "@/lib/agents/configs";
import { buildQuotationPrompt } from "@/lib/agents/prompts/quotation";
import { generateQuoteTool } from "@/lib/agents/tools";
import type { Language } from "@/lib/agents/types";
import type { ChatMessage, QuoteLineItem } from "@/lib/types";
import { limitAgentRequest, RATE_LIMIT_MESSAGE } from "@/lib/rateLimit";

export const runtime = "nodejs";

interface CustomerIntake {
  name: string;
  phone: string;
  jobType: string;
  details: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const customer: CustomerIntake = body.customer;
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
  const persona = config.agents.quotation;

  // The quote request is always the first user turn — keeps context every
  // turn and ensures the message sequence starts with `user`.
  const intake: Anthropic.MessageParam = {
    role: "user",
    content:
      language === "en"
        ? `[Quote request from form]\nName: ${customer.name}\nPhone: ${customer.phone}\nJob type: ${customer.jobType}\nDetails: ${customer.details}\n\n(This is the system triggering your first outreach — reply in English as ${persona.name} would.)`
        : `[Zapytanie o wycenę z formularza]\nImię i nazwisko: ${customer.name}\nTelefon: ${customer.phone}\nRodzaj instalacji: ${customer.jobType}\nSzczegóły: ${customer.details}\n\n(To jest pierwszy sygnał od systemu — odpisz po polsku jako ${persona.name}.)`,
  };
  const messages: Anthropic.MessageParam[] = [
    intake,
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  const response = await client.messages.create({
    model: config.model?.quotation?.model ?? defaultModel(),
    max_tokens: config.model?.quotation?.maxTokens ?? 700,
    system: buildQuotationPrompt(config, language),
    tools: [generateQuoteTool(language)],
    messages,
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const toolBlock = response.content.find((b) => b.type === "tool_use");

  let quote = null;
  if (toolBlock && toolBlock.type === "tool_use") {
    const input = toolBlock.input as {
      customer_name: string;
      job_type: string;
      line_items: QuoteLineItem[];
      total: number;
      notes: string;
    };
    quote = await addQuote(config.id, {
      customerName: input.customer_name,
      phone: customer.phone,
      jobType: input.job_type,
      lineItems: input.line_items,
      total: input.total,
      notes: input.notes,
    });
    await addLead(config.id, {
      name: customer.name,
      phone: customer.phone,
      need: `${customer.jobType}: ${customer.details}`,
      source: "quotation",
      status: "quoted",
    });
  }

  return NextResponse.json({
    reply: textBlock && textBlock.type === "text" ? textBlock.text : "",
    quote,
  });
}
