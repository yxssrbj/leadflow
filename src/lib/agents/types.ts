export type Language = "pl" | "en";

// A per-language pricing line the quotation agent can quote from — kept as a
// single guidance string (not structured line items) because the agent still
// needs to reason about sizing/complexity, not just look up a table.
export interface PricingNote {
  pl: string;
  en: string;
}

export interface AgentPersona {
  name: string;
  // English descriptor used inside the (English) meta-instructions, e.g.
  // "intake agent" — never shown to the lead, so it doesn't need translating.
  role: string;
}

// Everything the three agent prompt-builders (speed-to-lead, quotation,
// outbound) need to know about a specific client business. One of these is
// the whole "template" — copy an existing config, change the fields, and the
// same three agents run for a completely different business/vertical with no
// prompt-string edits. See docs/agent-templates.md.
//
// Most fields here are meta-instructions Claude reads in English regardless
// of which language it replies in (the `language` argument on every prompt
// builder controls the reply language via a single "write only in X" rule).
// The one exception is `pricingGuide`: those sentences get copied close to
// verbatim into the agent's tool-call output, so they must already exist in
// both languages.
export interface BusinessConfig {
  id: string;
  businessName: string;
  city: string;
  vertical: string;

  // The three agent personas this business uses (speed-to-lead / quotation / outbound).
  agents: {
    speedToLead: AgentPersona;
    quotation: AgentPersona;
    outbound: AgentPersona;
  };

  // Free-text service list used in prompt intros, e.g. "photovoltaic systems,
  // energy storage, and heat pumps for homes and small businesses".
  services: string;

  // The site visit / consult the speed-to-lead and outbound agents book, e.g.
  // "free on-site audit (bezpłatny audyt / wizja lokalna)".
  appointmentLabel: string;

  // Qualifying questions the intake agents ask, in priority order. Each is a
  // free-text instruction the prompt lists verbatim.
  qualifyingQuestions: string[];

  // Pricing guidance for the quotation agent — the full "how to estimate" text
  // block, including sizing rules of thumb. Must be pre-written in each
  // language since it feeds the tool-call output directly.
  pricingGuide: PricingNote;

  // Local subsidy/incentive programs worth mentioning, if any (empty string = skip).
  // NOTE deliberately no `currency` field: lib/format.ts renders PLN across the
  // whole app. If a non-PLN client ever signs, currency must be stored on each
  // Quote record (not just config), so display and history stay correct.
  subsidyNote: string;

  // Per-agent model params. Falls back to the global default MODEL/max_tokens
  // in lib/anthropic.ts and the builder's own default when omitted.
  model?: {
    speedToLead?: { model?: string; maxTokens?: number };
    quotation?: { model?: string; maxTokens?: number };
    outbound?: { model?: string; maxTokens?: number };
  };
}
