import { beforeAll, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { solartech } from "@/lib/agents/configs/solartech";
import { budmaxRemont } from "@/lib/agents/configs/budmax-remont";
import type { BusinessConfig } from "@/lib/agents/types";
import type { Appointment, Lead, Quote } from "@/lib/types";

// End-to-end regression for the demo's critical path, at the API level:
// chat turns → tool call → db writes — the same flow a prospect exercises in
// the browser, minus the UI. Runs on the mock provider (no credentials) and
// against a throwaway DATA_DIR so the real demo data is never touched.
//
// BusinessConfig now lives in Postgres (see src/lib/agents/configs/store.ts)
// instead of an in-memory REGISTRY — no real DATABASE_URL exists in CI, so
// the config lookup functions are mocked here to serve the same two static
// configs the old REGISTRY did. This keeps the whole suite credential-free.
// (tests/mock.test.ts already imports these same static objects directly to
// test the prompt builders, unaffected by this mock.)
const STATIC_CONFIGS: Record<string, BusinessConfig> = {
  [solartech.id]: solartech,
  [budmaxRemont.id]: budmaxRemont,
};
vi.mock("@/lib/agents/configs", () => ({
  DEFAULT_BUSINESS_ID: solartech.id,
  getBusinessConfig: async (id?: string) => STATIC_CONFIGS[id ?? ""] ?? STATIC_CONFIGS[solartech.id],
  isBusinessId: async (id: string) => id in STATIC_CONFIGS,
  listBusinessConfigs: async () => Object.values(STATIC_CONFIGS),
}));

// Same idea for the CRM data (leads/appointments/quotes, now Postgres-backed
// — see src/lib/crm.ts): an in-memory fake with the same function
// signatures, seeded via the real curatedSeedFor() (pulled in via
// importActual so the seed data itself has exactly one source of truth,
// shared with scripts/seed-crm-data.ts and resetCrmData()).
vi.mock("@/lib/crm", async () => {
  const actual = await vi.importActual<typeof import("@/lib/crm")>("@/lib/crm");
  let leads: Lead[] = [];
  let appointments: Appointment[] = [];
  let quotes: Quote[] = [];

  function reseed(businessId: string) {
    leads = leads.filter((l) => l.businessId !== businessId);
    appointments = appointments.filter((a) => a.businessId !== businessId);
    quotes = quotes.filter((q) => q.businessId !== businessId);
    const seed = actual.curatedSeedFor(businessId);
    leads.push(...seed.leads);
    appointments.push(...seed.appointments);
    quotes.push(...seed.quotes);
  }
  reseed(solartech.id); // initial state mirrors what `npm run db:seed` produces

  return {
    curatedSeedFor: actual.curatedSeedFor,
    getLeads: async (businessId: string) => leads.filter((l) => l.businessId === businessId),
    getLead: async (businessId: string, id: string) => leads.find((l) => l.businessId === businessId && l.id === id),
    addLead: async (businessId: string, data: Omit<Lead, "id" | "businessId" | "createdAt" | "lastContactAt">) => {
      const now = new Date().toISOString();
      const full: Lead = { ...data, id: randomUUID(), businessId, createdAt: now, lastContactAt: now };
      leads.push(full);
      return full;
    },
    updateLead: async (businessId: string, id: string, patch: Partial<Omit<Lead, "id" | "businessId">>) => {
      const existing = leads.find((l) => l.businessId === businessId && l.id === id);
      if (!existing) return undefined;
      Object.assign(existing, patch, { lastContactAt: new Date().toISOString() });
      return existing;
    },
    getAppointments: async (businessId: string) => appointments.filter((a) => a.businessId === businessId),
    addAppointment: async (businessId: string, data: Omit<Appointment, "id" | "businessId" | "createdAt">) => {
      const full: Appointment = { ...data, id: randomUUID(), businessId, createdAt: new Date().toISOString() };
      appointments.push(full);
      return full;
    },
    getQuotes: async (businessId: string) => quotes.filter((q) => q.businessId === businessId),
    addQuote: async (businessId: string, data: Omit<Quote, "id" | "businessId" | "createdAt">) => {
      const full: Quote = { ...data, id: randomUUID(), businessId, createdAt: new Date().toISOString() };
      quotes.push(full);
      return full;
    },
    resetCrmData: async (businessId: string) => reseed(businessId),
  };
});

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "leadflow-test-"));
process.env.AGENT_PROVIDER = "mock";
delete process.env.VOICE_DEMO_PIN;

// Imported dynamically so the env above is set before module init.
type Db = typeof import("@/lib/db");
type Crm = typeof import("@/lib/crm");
type SpeedRoute = typeof import("@/app/api/agents/speed-to-lead/route");
type QuoteRoute = typeof import("@/app/api/agents/quotation/route");
type OutboundRoute = typeof import("@/app/api/agents/outbound/route");
type VoiceRoute = typeof import("@/app/api/voice/start/route");
type ResetRoute = typeof import("@/app/api/admin/reset/route");
type TrackRoute = typeof import("@/app/api/track/route");

let db: Db;
let crm: Crm;
let speed: SpeedRoute;
let quote: QuoteRoute;
let outbound: OutboundRoute;
let voice: VoiceRoute;
let reset: ResetRoute;
let trackRoute: TrackRoute;

beforeAll(async () => {
  db = await import("@/lib/db");
  crm = await import("@/lib/crm");
  speed = await import("@/app/api/agents/speed-to-lead/route");
  quote = await import("@/app/api/agents/quotation/route");
  outbound = await import("@/app/api/agents/outbound/route");
  voice = await import("@/app/api/voice/start/route");
  reset = await import("@/app/api/admin/reset/route");
  trackRoute = await import("@/app/api/track/route");
});

function post(url: string, body: unknown, ip = "10.1.1.1") {
  return new NextRequest(`http://localhost${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

const LEAD = { name: "Test Lead", phone: "+48 500 000 111", need: "fotowoltaika, dom 150 m²" };

describe("speed-to-lead flow (mock provider)", () => {
  it("runs form → qualify → booking and lands in the db", async () => {
    // Turn 1 — form submitted
    let res = await speed.POST(post("/api/agents/speed-to-lead", { lead: LEAD, history: [], language: "pl" }));
    expect(res.status).toBe(200);
    let data = await res.json();
    expect(data.reply).toContain("Ola");
    expect(data.leadId).toBeTruthy();
    const leadId = data.leadId;
    expect(data.booking).toBeFalsy();

    const history = [
      { role: "assistant", content: data.reply },
      { role: "user", content: "Tak, dom jednorodzinny." },
    ];

    // Turn 2 — qualification
    res = await speed.POST(post("/api/agents/speed-to-lead", { lead: LEAD, history, language: "pl", leadId }));
    data = await res.json();
    expect(data.booking).toBeFalsy();
    history.push({ role: "assistant", content: data.reply }, { role: "user", content: "9:00 pasuje" });

    // Turn 3 — booking tool fires
    res = await speed.POST(post("/api/agents/speed-to-lead", { lead: LEAD, history, language: "pl", leadId }));
    data = await res.json();
    expect(data.booking).toBeTruthy();
    expect(data.booking.name).toBe(LEAD.name);

    const appts = await crm.getAppointments("solartech");
    expect(appts.some((a) => a.leadName === LEAD.name)).toBe(true);
    expect((await crm.getLead("solartech", leadId))?.status).toBe("booked");
  });

  it("respects businessId — replies come from the other config's persona", async () => {
    const res = await speed.POST(
      post("/api/agents/speed-to-lead", { lead: LEAD, history: [], language: "pl", businessId: "budmax-remont" }),
    );
    const data = await res.json();
    expect(data.reply).toContain("Iga");
    expect(data.reply).toContain("BudMax");
  });

  it("isolates leads by business — a budmax-remont lead is invisible to solartech's dashboard", async () => {
    const res = await speed.POST(
      post("/api/agents/speed-to-lead", {
        lead: { name: "Tenant Isolation Test", phone: "+48 500 999 999", need: "test" },
        history: [],
        language: "pl",
        businessId: "budmax-remont",
      }),
    );
    const data = await res.json();

    const budmaxLeads = await crm.getLeads("budmax-remont");
    const solartechLeads = await crm.getLeads("solartech");
    expect(budmaxLeads.some((l) => l.id === data.leadId)).toBe(true);
    expect(solartechLeads.some((l) => l.id === data.leadId)).toBe(false);
  });
});

describe("quotation flow (mock provider)", () => {
  it("produces a quote whose total matches its line items", async () => {
    const customer = { name: "Anna Test", phone: "+48 600 111 222", jobType: "Fotowoltaika", details: "dom 160 m²" };
    let res = await quote.POST(post("/api/agents/quotation", { customer, history: [], language: "pl" }));
    let data = await res.json();
    expect(data.quote).toBeFalsy();

    res = await quote.POST(
      post("/api/agents/quotation", {
        customer,
        history: [
          { role: "assistant", content: data.reply },
          { role: "user", content: "700 zł miesięcznie, 160 m²" },
        ],
        language: "pl",
      }),
    );
    data = await res.json();
    expect(data.quote).toBeTruthy();
    const sum = data.quote.lineItems.reduce((s: number, li: { amount: number }) => s + li.amount, 0);
    expect(data.quote.total).toBe(sum);
    expect((await crm.getQuotes("solartech")).some((q) => q.customerName === "Anna Test")).toBe(true);
  });
});

describe("outbound flow (mock provider)", () => {
  it("closes a dead lead after a clear decline", async () => {
    const dead = (await crm.getLeads("solartech")).find((l) => l.status === "dead");
    expect(dead).toBeTruthy();

    let res = await outbound.POST(post("/api/agents/outbound", { leadId: dead!.id, history: [], language: "pl" }));
    let data = await res.json();
    expect(data.reply).toBeTruthy();

    res = await outbound.POST(
      post("/api/agents/outbound", {
        leadId: dead!.id,
        history: [
          { role: "assistant", content: data.reply },
          { role: "user", content: "Nie, dziękuję, proszę nie pisać." },
        ],
        language: "pl",
      }),
    );
    data = await res.json();
    expect(data.closed).toBeTruthy();
    expect((await crm.getLead("solartech", dead!.id))?.status).toBe("closed");
  });
});

describe("guards", () => {
  it("voice route is disabled without VOICE_DEMO_PIN", async () => {
    const res = await voice.POST(post("/api/voice/start", { lead: LEAD }));
    expect(res.status).toBe(503);
  });

  it("voice route demands the PIN when configured", async () => {
    process.env.VOICE_DEMO_PIN = "4321";
    const res = await voice.POST(post("/api/voice/start", { lead: LEAD, pin: "0000" }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.pinRequired).toBe(true);
    delete process.env.VOICE_DEMO_PIN;
  });

  it("rate-limits chat turns per IP", async () => {
    process.env.AGENT_RATE_PER_MINUTE = "3";
    const ip = "10.9.9.9";
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      const res = await speed.POST(
        post("/api/agents/speed-to-lead", { lead: LEAD, history: [], language: "pl" }, ip),
      );
      statuses.push(res.status);
    }
    delete process.env.AGENT_RATE_PER_MINUTE;
    expect(statuses.filter((s) => s === 429).length).toBeGreaterThan(0);
    expect(statuses[0]).toBe(200);
  });

  it("track accepts allowlisted events and rejects junk", async () => {
    const ok = await trackRoute.POST(post("/api/track", { session: "s1", name: "demo_opened", meta: { tab: "quotation" } }));
    expect(ok.status).toBe(200);
    const bad = await trackRoute.POST(post("/api/track", { session: "s1", name: "drop_tables" }));
    expect(bad.status).toBe(400);
    expect(db.getEvents().some((e) => e.name === "demo_opened")).toBe(true);
  });

  it("reset restores one business's seed data without touching another's", async () => {
    // Pollute budmax-remont so we can prove reset only clears the business we ask for.
    await crm.addLead("budmax-remont", { name: "Should Survive", phone: "x", need: "x", source: "crm-import", status: "new" });

    const res = await reset.POST(post("/api/admin/reset", { businessId: "solartech" }));
    expect(res.status).toBe(200);

    const solartechLeads = await crm.getLeads("solartech");
    expect(solartechLeads.length).toBe(5); // seeded demo leads
    expect(solartechLeads.filter((l) => l.status === "dead").length).toBe(3);
    expect(db.getEvents().length).toBeGreaterThan(0); // analytics events survived the reset

    const budmaxLeads = await crm.getLeads("budmax-remont");
    expect(budmaxLeads.some((l) => l.name === "Should Survive")).toBe(true);
  });
});
