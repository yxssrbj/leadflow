import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/postgres";
import { appointments, leads, quotes } from "@/lib/schema";
import type { Appointment, Lead, Quote } from "@/lib/types";
import { nextBusinessSlots } from "@/lib/db";

// Postgres-backed CRM data (leads/appointments/quotes) — see
// docs/tech-stack-roadmap.md "Multi-tenant CRM data". Every read/write is
// scoped by businessId, and lookups-by-id filter on businessId too, so a
// leaked UUID can never be read across a tenant boundary once real auth
// restricts which businessId a caller may pass. Mirrors the shape of
// lib/agents/configs/store.ts (no cache here, though — CRM writes are
// bursty and correctness-sensitive during a live demo chat, unlike config
// reads, so every call hits Postgres directly).

const DEFAULT_BUSINESS_ID = "solartech";

// --- Leads ---

export async function getLeads(businessId: string): Promise<Lead[]> {
  const rows = await getDb().select().from(leads).where(eq(leads.businessId, businessId)).orderBy(desc(leads.createdAt));
  return rows;
}

export async function getLead(businessId: string, id: string): Promise<Lead | undefined> {
  const rows = await getDb()
    .select()
    .from(leads)
    .where(and(eq(leads.businessId, businessId), eq(leads.id, id)))
    .limit(1);
  return rows[0];
}

export async function addLead(
  businessId: string,
  lead: Omit<Lead, "id" | "businessId" | "createdAt" | "lastContactAt">,
): Promise<Lead> {
  const now = new Date().toISOString();
  const full: Lead = { ...lead, id: randomUUID(), businessId, createdAt: now, lastContactAt: now };
  await getDb().insert(leads).values(full);
  return full;
}

export async function updateLead(
  businessId: string,
  id: string,
  patch: Partial<Omit<Lead, "id" | "businessId">>,
): Promise<Lead | undefined> {
  const existing = await getLead(businessId, id);
  if (!existing) return undefined;
  const lastContactAt = new Date().toISOString();
  await getDb()
    .update(leads)
    .set({ ...patch, lastContactAt })
    .where(and(eq(leads.businessId, businessId), eq(leads.id, id)));
  return { ...existing, ...patch, lastContactAt };
}

// --- Appointments ---

export async function getAppointments(businessId: string): Promise<Appointment[]> {
  return getDb()
    .select()
    .from(appointments)
    .where(eq(appointments.businessId, businessId))
    .orderBy(desc(appointments.createdAt));
}

export async function addAppointment(
  businessId: string,
  appt: Omit<Appointment, "id" | "businessId" | "createdAt">,
): Promise<Appointment> {
  const full: Appointment = { ...appt, id: randomUUID(), businessId, createdAt: new Date().toISOString() };
  await getDb().insert(appointments).values(full);
  return full;
}

// --- Quotes ---

export async function getQuotes(businessId: string): Promise<Quote[]> {
  return getDb().select().from(quotes).where(eq(quotes.businessId, businessId)).orderBy(desc(quotes.createdAt));
}

export async function addQuote(
  businessId: string,
  quote: Omit<Quote, "id" | "businessId" | "createdAt">,
): Promise<Quote> {
  const full: Quote = { ...quote, id: randomUUID(), businessId, createdAt: new Date().toISOString() };
  await getDb().insert(quotes).values(full);
  return full;
}

// --- Seeding & reset ---

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

// The curated SolarTech Kraków demo narrative — the single source of truth
// for both the initial `npm run db:seed` (scripts/seed-crm-data.ts) and
// resetCrmData() below. Any other business starts empty: a brand-new client
// created via /admin/businesses has no fabricated history to show.
export function curatedSeedFor(businessId: string): { leads: Lead[]; appointments: Appointment[]; quotes: Quote[] } {
  if (businessId !== DEFAULT_BUSINESS_ID) return { leads: [], appointments: [], quotes: [] };

  const leadRows: Lead[] = [
    {
      id: randomUUID(),
      businessId,
      name: "Katarzyna Nowak",
      phone: "+48 512 384 129",
      need: "Pytała o instalację fotowoltaiczną ok. 8 kWp na domu w Wieliczce, po pierwszej rozmowie przestała odpisywać.",
      source: "crm-import",
      status: "dead",
      createdAt: daysAgo(41),
      lastContactAt: daysAgo(34),
    },
    {
      id: randomUUID(),
      businessId,
      name: "Marek Zieliński",
      phone: "+48 601 772 348",
      need: "Chciał wymienić stary piec gazowy na pompę ciepła, czekał na obiecaną wycenę i ucichł.",
      source: "crm-import",
      status: "dead",
      createdAt: daysAgo(58),
      lastContactAt: daysAgo(49),
    },
    {
      id: randomUUID(),
      businessId,
      name: "Agnieszka Wójcik",
      phone: "+48 883 214 907",
      need: "Zainteresowana magazynem energii do istniejącej instalacji PV, nie umówiła audytu.",
      source: "crm-import",
      status: "dead",
      createdAt: daysAgo(27),
      lastContactAt: daysAgo(21),
    },
    {
      id: randomUUID(),
      businessId,
      name: "Tomasz Kowalczyk",
      phone: "+48 794 556 023",
      need: "Po podwyżkach prądu chce fotowoltaikę z magazynem energii, dom jednorodzinny ok. 140 m².",
      source: "speed-to-lead",
      status: "booked",
      createdAt: daysAgo(2),
      lastContactAt: daysAgo(2),
    },
    {
      id: randomUUID(),
      businessId,
      name: "Ewa Baran",
      phone: "+48 605 908 441",
      need: "Porównuje oferty pompy ciepła do nowego domu pod Krakowem.",
      source: "quotation",
      status: "quoted",
      createdAt: daysAgo(4),
      lastContactAt: daysAgo(3),
    },
  ];

  const appointmentRows: Appointment[] = [
    {
      id: randomUUID(),
      businessId,
      leadName: "Tomasz Kowalczyk",
      phone: "+48 794 556 023",
      slot: nextBusinessSlots()[0],
      issueSummary: "Bezpłatny audyt: fotowoltaika z magazynem energii, dom 140 m².",
      agent: "speed-to-lead",
      createdAt: daysAgo(2),
    },
  ];

  const quoteRows: Quote[] = [
    {
      id: randomUUID(),
      businessId,
      customerName: "Ewa Baran",
      phone: "+48 605 908 441",
      jobType: "Pompa ciepła",
      lineItems: [
        { description: "Pompa ciepła powietrze-woda 10 kW z osprzętem", amount: 32000 },
        { description: "Montaż, podłączenie hydrauliczne i uruchomienie", amount: 8500 },
        { description: "Zbiornik CWU 300 l", amount: 4200 },
      ],
      total: 44700,
      notes:
        "Wstępna wycena — ostateczna po bezpłatnym audycie na miejscu. Ważna 30 dni. Możliwe dofinansowanie z programu Czyste Powietrze.",
      createdAt: daysAgo(3),
    },
  ];

  return { leads: leadRows, appointments: appointmentRows, quotes: quoteRows };
}

// Clears a business's leads/appointments/quotes and reseeds the curated
// demo narrative if it's the default business, or leaves it empty
// otherwise. Analytics events are untouched (see lib/db.ts) — resetting the
// pitch data shouldn't erase the record of who used the demo.
export async function resetCrmData(businessId: string): Promise<void> {
  const db = getDb();
  await db.delete(leads).where(eq(leads.businessId, businessId));
  await db.delete(appointments).where(eq(appointments.businessId, businessId));
  await db.delete(quotes).where(eq(quotes.businessId, businessId));

  const seed = curatedSeedFor(businessId);
  if (seed.leads.length) await db.insert(leads).values(seed.leads);
  if (seed.appointments.length) await db.insert(appointments).values(seed.appointments);
  if (seed.quotes.length) await db.insert(quotes).values(seed.quotes);
}
