import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { AnalyticsEvent } from "./types";

// DATA_DIR override exists so the test suite can point the whole db layer at
// a throwaway temp directory instead of polluting the real demo data.
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

// Analytics events are capped so db.json can't grow unbounded.
const MAX_EVENTS = 5000;

// Leads/appointments/quotes live in Postgres now (see lib/crm.ts and
// docs/tech-stack-roadmap.md "Multi-tenant CRM data") — this file is left
// with the one thing that's still flat-file: analytics events. They're
// lower-stakes than real lead data and deliberately out of scope for the
// businessId migration (see the plan's scope boundaries).
interface DbShape {
  events?: AnalyticsEvent[];
}

function load(): DbShape {
  if (!fs.existsSync(DB_PATH)) return {};
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8")) as DbShape;
}

function persist(db: DbShape) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export function addEvent(event: Omit<AnalyticsEvent, "id" | "at">): AnalyticsEvent {
  const db = load();
  const full: AnalyticsEvent = { ...event, id: randomUUID(), at: new Date().toISOString() };
  db.events = [...(db.events ?? []), full].slice(-MAX_EVENTS);
  persist(db);
  return full;
}

export function getEvents(): AnalyticsEvent[] {
  return load().events ?? [];
}

// Mock calendar: two audit slots per business day for the next 3 business days.
export function nextBusinessSlots(language: "pl" | "en" = "pl"): string[] {
  const locale = language === "en" ? "en-US" : "pl-PL";
  const slots: string[] = [];
  const d = new Date();
  while (slots.length < 6) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const label = d.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
    slots.push(`${label} · 9:00`, `${label} · 13:30`);
  }
  return slots;
}
