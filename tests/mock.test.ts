import { describe, expect, it } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { createMockClient } from "@/lib/mock";
import { buildSpeedToLeadPrompt } from "@/lib/agents/prompts/speedToLead";
import { buildQuotationPrompt } from "@/lib/agents/prompts/quotation";
import { buildOutboundPrompt } from "@/lib/agents/prompts/outbound";
import { bookAppointmentTool, bookAppointmentToolMinimal, closeLeadTool, generateQuoteTool } from "@/lib/agents/tools";
import { solartech } from "@/lib/agents/configs/solartech";
import { budmaxRemont } from "@/lib/agents/configs/budmax-remont";
import type { Lead } from "@/lib/types";

// The mock provider parses the persona/business name and the offered slots
// back OUT of the real system prompts (see lib/mock.ts). That coupling is
// exactly the kind of thing that breaks silently when prompt wording changes,
// so these tests exercise the real prompt builders against the real mock.

const SLOTS = ["pon., 14 lip · 9:00", "pon., 14 lip · 13:30", "wt., 15 lip · 9:00"];

function text(content: Anthropic.Message["content"]): string {
  const block = content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

function toolUse(content: Anthropic.Message["content"]) {
  return content.find((b) => b.type === "tool_use");
}

const PL_INTAKE = `[Zgłoszenie z formularza na stronie]\nImię i nazwisko: Jan Testowy\nTelefon: +48 500 100 200\nCzego potrzebuje: fotowoltaika na dach\n\n(To jest pierwszy sygnał od systemu — odpisz po polsku jako Ola.)`;
const EN_INTAKE = `[Web form submission]\nName: John Test\nPhone: +1 555 100 2000\nWhat they need: solar panels\n\n(This is the system triggering your first outreach — reply in English as Ola would.)`;

describe("mock provider ↔ prompt builder coupling", () => {
  const client = createMockClient();

  it("extracts persona and business name from the speed-to-lead prompt (PL)", async () => {
    const res = await client.messages.create({
      model: "mock",
      max_tokens: 400,
      system: buildSpeedToLeadPrompt(solartech, "pl", SLOTS),
      tools: [bookAppointmentTool("pl", solartech.appointmentLabel)],
      messages: [{ role: "user", content: PL_INTAKE }],
    });
    const reply = text(res.content);
    expect(reply).toContain("Ola");
    expect(reply).toContain("SolarTech Kraków");
    expect(toolUse(res.content)).toBeUndefined(); // first turn never books
  });

  it("stays correct for a different business config (budmax-remont)", async () => {
    const res = await client.messages.create({
      model: "mock",
      max_tokens: 400,
      system: buildSpeedToLeadPrompt(budmaxRemont, "pl", SLOTS),
      tools: [bookAppointmentTool("pl", budmaxRemont.appointmentLabel)],
      messages: [{ role: "user", content: PL_INTAKE.replace("jako Ola", "jako Iga") }],
    });
    const reply = text(res.content);
    expect(reply).toContain("Iga");
    expect(reply).toContain("BudMax Remonty");
    expect(reply).not.toContain("SolarTech");
  });

  it("books the first offered slot on the third user turn (EN)", async () => {
    const res = await client.messages.create({
      model: "mock",
      max_tokens: 400,
      system: buildSpeedToLeadPrompt(solartech, "en", SLOTS),
      tools: [bookAppointmentTool("en", solartech.appointmentLabel)],
      messages: [
        { role: "user", content: EN_INTAKE },
        { role: "assistant", content: "Is this your own home?" },
        { role: "user", content: "Yes it is." },
        { role: "assistant", content: "9:00 or 13:30?" },
        { role: "user", content: "9:00 works" },
      ],
    });
    const tool = toolUse(res.content);
    expect(tool?.type).toBe("tool_use");
    if (tool?.type === "tool_use") {
      expect(tool.name).toBe("book_appointment");
      const input = tool.input as { slot: string; name: string };
      expect(input.slot).toBe(SLOTS[0]);
      expect(input.name).toBe("John Test");
    }
  });

  it("routes to the quotation script when generate_quote is offered", async () => {
    const res = await client.messages.create({
      model: "mock",
      max_tokens: 700,
      system: buildQuotationPrompt(solartech, "pl"),
      tools: [generateQuoteTool("pl")],
      messages: [
        {
          role: "user",
          content: `[Zapytanie o wycenę z formularza]\nImię i nazwisko: Anna Test\nTelefon: +48 600 000 000\nRodzaj instalacji: Fotowoltaika\nSzczegóły: dom 150 m²\n\n(To jest pierwszy sygnał od systemu — odpisz po polsku jako Kuba.)`,
        },
        { role: "assistant", content: "Jaki rachunek?" },
        { role: "user", content: "700 zł miesięcznie" },
      ],
    });
    const tool = toolUse(res.content);
    expect(tool?.type).toBe("tool_use");
    if (tool?.type === "tool_use") {
      expect(tool.name).toBe("generate_quote");
      const input = tool.input as { total: number; line_items: { amount: number }[] };
      expect(input.total).toBe(input.line_items.reduce((s, li) => s + li.amount, 0));
    }
  });

  it("closes the lead on a clear decline in the outbound flow", async () => {
    const lead: Lead = {
      id: "test",
      businessId: solartech.id,
      name: "Katarzyna Nowak",
      phone: "+48 512 384 129",
      need: "fotowoltaika 8 kWp",
      source: "crm-import",
      status: "dead",
      createdAt: new Date().toISOString(),
      lastContactAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    };
    const res = await client.messages.create({
      model: "mock",
      max_tokens: 400,
      system: buildOutboundPrompt(solartech, "pl", lead, SLOTS),
      tools: [bookAppointmentToolMinimal("pl", solartech.appointmentLabel), closeLeadTool("pl")],
      messages: [
        { role: "user", content: "[Sygnał z CRM] Ten uśpiony lead właśnie trafił do ponownego kontaktu. Wyślij pierwszą wiadomość po polsku jako Marek." },
        { role: "assistant", content: "Dzień dobry! Temat aktualny?" },
        { role: "user", content: "Nie, dziękuję, już mam wykonawcę." },
      ],
    });
    const tool = toolUse(res.content);
    expect(tool?.type).toBe("tool_use");
    if (tool?.type === "tool_use") expect(tool.name).toBe("close_lead");
  });
});
