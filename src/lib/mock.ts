import type Anthropic from "@anthropic-ai/sdk";
import type { AgentClient } from "./anthropic";

// A no-API stand-in for the Claude client. It returns believable agent
// replies (Polish or English) and fires the same tool calls
// (book_appointment / generate_quote / close_lead) the real agents would, so
// the full flow — chat, DB writes, dashboard, result cards — can be
// exercised end to end without any credentials. It is NOT a language model:
// replies are scripted by turn count and by which tools the route exposes.
// Use it to test plumbing, not conversation quality.
//
// It stays business-agnostic (works for any lib/agents/configs/*.ts) by
// parsing the persona name and business name back out of the system
// prompt's own opening line — see lib/agents/prompts/shared.ts#openingLine —
// instead of hardcoding "Ola" / "SolarTech Kraków".

type Params = Anthropic.MessageCreateParamsNonStreaming;
type Block = { type: "text"; text: string } | { type: "tool_use"; id: string; name: string; input: unknown };

function text(t: string): Block {
  return { type: "text", text: t };
}

function toolUse(name: string, input: unknown): Block {
  return { type: "tool_use", id: "toolu_mock_" + Math.random().toString(36).slice(2), name, input };
}

function systemText(system: Params["system"]): string {
  if (typeof system === "string") return system;
  if (Array.isArray(system)) return system.map((b) => ("text" in b ? b.text : "")).join(" ");
  return "";
}

function userMessages(messages: Params["messages"]): string[] {
  return messages
    .filter((m) => m.role === "user")
    .map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content)));
}

function field(text: string, label: string): string {
  const m = text.match(new RegExp(label + ":\\s*(.+)"));
  return m ? m[1].trim() : "";
}

// Pulls "{persona name}" and "{business name}" out of the system prompt's
// opening line ("You are {name}, the AI {role} for {business}, a ...").
function personaAndBusiness(system: Params["system"]): { name: string; business: string } {
  const s = systemText(system);
  const m = s.match(/You are ([^,]+), the AI [^]+? for ([^,]+),/);
  return { name: m?.[1]?.trim() ?? "Agent", business: m?.[2]?.trim() ?? "the company" };
}

// Pull the two offered appointment slots out of the system prompt so the booked
// time matches what a real agent would show. Falls back to generic labels.
function offeredSlots(system: Params["system"]): [string, string] {
  const s = systemText(system);
  const m = s.match(/list only:\s*([\s\S]+?)\.\s*Never/);
  const list = m ? m[1] : s;
  // Each slot ends in "· H:MM" but also contains an internal comma
  // ("pon., 13 lip · 9:00"), so anchor on the time rather than splitting on ",".
  const slots = (list.match(/[^·]+·\s*\d{1,2}:\d{2}/g) ?? [])
    .map((x) => x.replace(/^[\s,]+/, "").trim())
    .filter(Boolean);
  return [slots[0] ?? "jutro · 9:00", slots[1] ?? "jutro · 13:30"];
}

function speedToLead(params: Params): Block[] {
  const msgs = params.messages;
  const users = userMessages(msgs);
  const intake = users[0] ?? "";
  const [slotA, slotB] = offeredSlots(params.system);
  const { name: agentName, business } = personaAndBusiness(params.system);

  // olaAgent.ts marks the intake message differently per language — use that
  // as the reliable signal rather than guessing from free text.
  const isEnglish = intake.startsWith("[Web form submission]");

  if (isEnglish) {
    const name = field(intake, "Name") || "there";
    const phone = field(intake, "Phone") || "+1 555 000 0000";
    const need = field(intake, "What they need") || "a solar installation";

    if (users.length <= 1) {
      return [
        text(
          `Hi, this is ${agentName} from ${business}. I saw you're reaching out about: "${need}". Is this for a single-family home that you own?`,
        ),
      ];
    }
    if (users.length === 2) {
      return [
        text(`Great, thanks! I can get you booked for a free on-site visit — does ${slotA} or ${slotB} work better?`),
      ];
    }
    return [
      text(`Booking you in for ${slotA}. See you then — I'll send a reminder the day before.`),
      toolUse("book_appointment", {
        slot: slotA,
        name,
        phone,
        issue_summary: `Free visit: ${need}`,
      }),
    ];
  }

  const name = field(intake, "Imię i nazwisko") || "Klient";
  const phone = field(intake, "Telefon") || "+48 500 000 000";
  const need = field(intake, "Czego potrzebuje") || "instalacja fotowoltaiczna";

  if (users.length <= 1) {
    return [
      text(
        `Dzień dobry, tu ${agentName} z ${business}. Widzę, że pisze Pan/Pani w sprawie: „${need}”. Czy chodzi o dom jednorodzinny, którego są Państwo właścicielami?`,
      ),
    ];
  }
  if (users.length === 2) {
    return [
      text(
        `Świetnie, dziękuję. Mogę umówić bezpłatny audyt — pasuje termin ${slotA} czy ${slotB}?`,
      ),
    ];
  }
  return [
    text(`Rezerwuję termin ${slotA}. Do zobaczenia! Przypomnę SMS-em dzień wcześniej.`),
    toolUse("book_appointment", {
      slot: slotA,
      name,
      phone,
      issue_summary: `Bezpłatny audyt: ${need}`,
    }),
  ];
}

function quotationLineItems(jobType: string, isEnglish: boolean): { jt: string; lineItems: { description: string; amount: number }[] } {
  const lc = jobType.toLowerCase();
  if (lc.includes("pompa") || lc.includes("heat pump")) {
    return {
      jt: isEnglish ? "Heat pump" : "Pompa ciepła",
      lineItems: isEnglish
        ? [
            { description: "Air-to-water heat pump 10 kW with fittings", amount: 32000 },
            { description: "Installation, plumbing hookup, and commissioning", amount: 8500 },
            { description: "300 L hot-water tank", amount: 4200 },
          ]
        : [
            { description: "Pompa ciepła powietrze-woda 10 kW z osprzętem", amount: 32000 },
            { description: "Montaż, podłączenie hydrauliczne i uruchomienie", amount: 8500 },
            { description: "Zbiornik CWU 300 l", amount: 4200 },
          ],
    };
  }
  if (lc.includes("magazyn") || lc.includes("storage")) {
    return {
      jt: isEnglish ? "Solar PV + energy storage" : "Fotowoltaika + magazyn energii",
      lineItems: isEnglish
        ? [
            { description: "8 kWp photovoltaic system (panels + inverter)", amount: 34000 },
            { description: "10 kWh energy storage", amount: 28000 },
            { description: "Installation and commissioning", amount: 7000 },
          ]
        : [
            { description: "Instalacja fotowoltaiczna 8 kWp (panele + falownik)", amount: 34000 },
            { description: "Magazyn energii 10 kWh", amount: 28000 },
            { description: "Montaż i uruchomienie", amount: 7000 },
          ],
    };
  }
  return {
    jt: isEnglish ? "Photovoltaic system" : "Fotowoltaika",
    lineItems: isEnglish
      ? [
          { description: "8 kWp photovoltaic system (panels + inverter)", amount: 34000 },
          { description: "Installation and commissioning", amount: 6000 },
          { description: "DC/AC wiring and protection", amount: 2500 },
        ]
      : [
          { description: "Instalacja fotowoltaiczna 8 kWp (panele + falownik)", amount: 34000 },
          { description: "Montaż i uruchomienie", amount: 6000 },
          { description: "Zabezpieczenia i okablowanie DC/AC", amount: 2500 },
        ],
  };
}

function quotation(params: Params): Block[] {
  const users = userMessages(params.messages);
  const intake = users[0] ?? "";
  const { name: agentName, business } = personaAndBusiness(params.system);
  const isEnglish = intake.startsWith("[Quote request from form]");

  if (isEnglish) {
    const jobType = field(intake, "Job type") || "Solar PV";
    if (users.length <= 1) {
      return [
        text(
          `Hi, this is ${agentName} from ${business}. Happy to put together a preliminary estimate. What's your monthly electricity bill, and roughly how big is the house?`,
        ),
      ];
    }
    const name = field(intake, "Name") || "Customer";
    const { jt, lineItems } = quotationLineItems(jobType, true);
    const total = lineItems.reduce((sum, li) => sum + li.amount, 0);
    return [
      text(`Thanks for the details — your preliminary estimate is ready below. Final price is confirmed after a free on-site visit.`),
      toolUse("generate_quote", {
        customer_name: name,
        job_type: jt,
        line_items: lineItems,
        total,
        notes: "Preliminary estimate — final price confirmed after a free on-site visit. Valid 30 days. Subsidies may reduce the final cost.",
      }),
    ];
  }

  const name = field(intake, "Imię i nazwisko") || "Klient";
  const jobType = field(intake, "Rodzaj instalacji") || "Fotowoltaika";

  if (users.length <= 1) {
    return [
      text(
        `Dzień dobry, tu ${agentName} z ${business}. Chętnie przygotuję wstępną wycenę. Jaki jest miesięczny rachunek za prąd i mniej więcej metraż domu?`,
      ),
    ];
  }

  const { jt, lineItems } = quotationLineItems(jobType, false);
  const total = lineItems.reduce((sum, li) => sum + li.amount, 0);

  return [
    text(
      `Dziękuję za informacje — wstępna wycena jest gotowa poniżej. Ostateczna kwota po bezpłatnym audycie na miejscu.`,
    ),
    toolUse("generate_quote", {
      customer_name: name,
      job_type: jt,
      line_items: lineItems,
      total,
      notes:
        "Wstępna wycena — ostateczna po bezpłatnym audycie. Ważna 30 dni. Możliwe dofinansowanie (Mój Prąd / Czyste Powietrze).",
    }),
  ];
}

const DECLINE_PL = /(nie jestem|nie dzięk|już (mam|kupi|zdecyd|zamów)|konkurencj|rezygn|odpuszcz|proszę nie|bez zaintereso|\bnie,)/i;
const DECLINE_EN = /(not interested|no thanks|already (have|bought|decided|hired)|competitor|stop (contacting|messaging)|please don'?t|not right now)/i;

function outbound(params: Params): Block[] {
  const sys = systemText(params.system);
  const users = userMessages(params.messages);
  const { name: agentName, business } = personaAndBusiness(params.system);
  const isEnglish = users[0]?.startsWith("[CRM signal]") ?? false;
  const name = (sys.match(/-\s*Name:\s*(.+)/) ?? [])[1]?.trim() || (isEnglish ? "there" : "Klient");
  const need = (sys.match(/-\s*Original inquiry:\s*(.+)/) ?? [])[1]?.trim() || (isEnglish ? "a renewable energy install" : "instalacja OZE");
  const [slotA, slotB] = offeredSlots(params.system);
  const lastUser = users[users.length - 1] ?? "";

  if (isEnglish) {
    if (users.length <= 1) {
      return [
        text(
          `Hi ${name}, this is ${agentName} from ${business}. A while back you asked about: "${need}". Is that still something you're considering? We happen to have a crew in your area this week.`,
        ),
      ];
    }
    if (DECLINE_EN.test(lastUser)) {
      return [
        text(`Totally understand — thanks for letting me know, and have a great day. We're here if that ever changes.`),
        toolUse("close_lead", { reason: "No longer interested." }),
      ];
    }
    if (users.length === 2) {
      return [text(`Great! I can get you booked for a free on-site visit — does ${slotA} or ${slotB} work better?`)];
    }
    return [
      text(`Booking you in for ${slotA}. Thanks, see you then!`),
      toolUse("book_appointment", { slot: slotA, issue_summary: `Re-engagement — visit: ${need}` }),
    ];
  }

  if (users.length <= 1) {
    return [
      text(
        `Dzień dobry, ${name}! Tu ${agentName} z ${business}. Jakiś czas temu pytał/a Pan/i o: „${need}”. Temat jest jeszcze aktualny? Akurat mamy w tym tygodniu ekipę w Państwa okolicy.`,
      ),
    ];
  }
  if (DECLINE_PL.test(lastUser)) {
    return [
      text(`Jasne, rozumiem — dziękuję za odpowiedź i życzę miłego dnia. Gdyby coś, jesteśmy do dyspozycji.`),
      toolUse("close_lead", { reason: "Klient nie jest już zainteresowany." }),
    ];
  }
  if (users.length === 2) {
    return [text(`Świetnie! Mogę umówić bezpłatny audyt — pasuje termin ${slotA} czy ${slotB}?`)];
  }
  return [
    text(`Rezerwuję termin ${slotA}. Dziękuję i do zobaczenia!`),
    toolUse("book_appointment", { slot: slotA, issue_summary: `Ponowny kontakt — audyt: ${need}` }),
  ];
}

function respond(params: Params): Block[] {
  const toolNames = (params.tools ?? []).map((t) => (t as { name?: string }).name);
  if (toolNames.includes("generate_quote")) return quotation(params);
  if (toolNames.includes("close_lead")) return outbound(params);
  return speedToLead(params);
}

export function createMockClient(): AgentClient {
  return {
    messages: {
      async create(params: Params): Promise<Anthropic.Message> {
        const content = respond(params);
        return {
          id: "msg_mock_" + Date.now(),
          type: "message",
          role: "assistant",
          model: "mock",
          stop_reason: content.some((b) => b.type === "tool_use") ? "tool_use" : "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 0, output_tokens: 0 },
          content,
        } as unknown as Anthropic.Message;
      },
    },
  };
}
