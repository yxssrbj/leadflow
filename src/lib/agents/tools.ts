import type Anthropic from "@anthropic-ai/sdk";
import type { Language } from "./types";

type Tool = Anthropic.Tool;

// Shared tool schemas used by every agent config — previously copy-pasted
// with slightly different wording into each of the three route files.

export function bookAppointmentTool(language: Language, appointmentLabel: string): Tool {
  return {
    name: "book_appointment",
    description: `Book the confirmed ${appointmentLabel} once the lead has picked a time.`,
    input_schema: {
      type: "object",
      properties: {
        slot: {
          type: "string",
          description: "The exact confirmed slot, must match one of the offered times.",
        },
        name: { type: "string" },
        phone: { type: "string" },
        issue_summary: {
          type: "string",
          description: `One-line summary in ${language === "en" ? "English" : "Polish"} of what the lead needs and urgency.`,
        },
      },
      required: ["slot", "name", "phone", "issue_summary"],
    },
  };
}

// Variant used by the outbound agent, where name/phone are already known from
// the CRM record and don't need to be re-collected from the model.
export function bookAppointmentToolMinimal(language: Language, appointmentLabel: string): Tool {
  return {
    name: "book_appointment",
    description: `Book the confirmed ${appointmentLabel} once the lead has picked a time.`,
    input_schema: {
      type: "object",
      properties: {
        slot: {
          type: "string",
          description: "The exact confirmed slot, must match one of the offered times.",
        },
        issue_summary: {
          type: "string",
          description: `One-line summary in ${language === "en" ? "English" : "Polish"} of what the appointment will cover.`,
        },
      },
      required: ["slot", "issue_summary"],
    },
  };
}

export function generateQuoteTool(language: Language): Tool {
  return {
    name: "generate_quote",
    description:
      "Generate the preliminary quote once you have enough information. All text fields in " +
      (language === "en" ? "English" : "Polish") +
      ", amounts as plain numbers.",
    input_schema: {
      type: "object",
      properties: {
        customer_name: { type: "string" },
        job_type: { type: "string" },
        line_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              amount: { type: "number" },
            },
            required: ["description", "amount"],
          },
        },
        total: { type: "number", description: "Must equal the sum of line item amounts." },
        notes: { type: "string" },
      },
      required: ["customer_name", "job_type", "line_items", "total", "notes"],
    },
  };
}

export function closeLeadTool(language: Language): Tool {
  return {
    name: "close_lead",
    description: "Mark the lead closed after a clear decline or opt-out.",
    input_schema: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: `Brief reason in ${language === "en" ? "English" : "Polish"}, e.g. "chose another company".`,
        },
      },
      required: ["reason"],
    },
  };
}
