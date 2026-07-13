export type LeadStatus =
  | "new"
  | "qualified"
  | "booked"
  | "quoted"
  | "dead"
  | "revived"
  | "closed";

export type LeadSource = "speed-to-lead" | "quotation" | "outbound" | "crm-import";

export interface Lead {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  need: string;
  source: LeadSource;
  status: LeadStatus;
  createdAt: string;
  lastContactAt: string;
}

export type AgentKind = "speed-to-lead" | "quotation" | "outbound";

export interface Appointment {
  id: string;
  businessId: string;
  leadName: string;
  phone: string;
  slot: string;
  issueSummary: string;
  agent: AgentKind;
  createdAt: string;
}

export interface QuoteLineItem {
  description: string;
  amount: number;
}

export interface Quote {
  id: string;
  businessId: string;
  customerName: string;
  phone: string;
  jobType: string;
  lineItems: QuoteLineItem[];
  total: number;
  notes: string;
  createdAt: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// First-party demo analytics — see src/lib/analytics.ts and /api/track.
export type AnalyticsEventName =
  | "demo_opened"
  | "tab_selected"
  | "chat_turn"
  | "booking_completed"
  | "quote_completed"
  | "lead_closed"
  | "call_requested"
  | "sms_requested";

export interface AnalyticsEvent {
  id: string;
  /** Anonymous per-browser session id, generated client-side. */
  session: string;
  name: AnalyticsEventName;
  /** Small free-form context, e.g. { tab: "quotation", locale: "pl" }. */
  meta?: Record<string, string>;
  at: string;
}
