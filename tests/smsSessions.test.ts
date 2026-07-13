import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSmsSession,
  deleteSmsSession,
  getSmsSession,
  normalizePhone,
} from "@/lib/smsSessions";

const LEAD = { name: "Jan Testowy", phone: "+48 500 100 200", need: "fotowoltaika" };

afterEach(() => {
  deleteSmsSession(LEAD.phone);
  vi.useRealTimers();
});

describe("normalizePhone", () => {
  it("strips spaces, dashes, dots, and parentheses", () => {
    expect(normalizePhone("+48 500 100 200")).toBe("+48500100200");
    expect(normalizePhone("+48-500-100-200")).toBe("+48500100200");
    expect(normalizePhone("(+48) 500.100.200")).toBe("+48500100200");
  });
});

describe("smsSessions", () => {
  it("finds a session created with a formatted number via the E.164 form Twilio sends", () => {
    createSmsSession(LEAD.phone, "lead-1", LEAD, "pl");
    const session = getSmsSession("+48500100200");
    expect(session).toBeDefined();
    expect(session?.leadId).toBe("lead-1");
    expect(session?.language).toBe("pl");
    expect(session?.history).toEqual([]);
  });

  it("returns undefined for a phone that never started a thread", () => {
    expect(getSmsSession("+48999888777")).toBeUndefined();
  });

  it("deletes a session", () => {
    createSmsSession(LEAD.phone, "lead-1", LEAD, "pl");
    deleteSmsSession(LEAD.phone);
    expect(getSmsSession(LEAD.phone)).toBeUndefined();
  });

  it("expires a session after 24h", () => {
    vi.useFakeTimers();
    createSmsSession(LEAD.phone, "lead-1", LEAD, "pl");
    vi.advanceTimersByTime(24 * 60 * 60 * 1000 - 1);
    expect(getSmsSession(LEAD.phone)).toBeDefined();
    vi.advanceTimersByTime(2);
    expect(getSmsSession(LEAD.phone)).toBeUndefined();
  });

  it("keeps history mutations visible on subsequent lookups (shared reference)", () => {
    const session = createSmsSession(LEAD.phone, "lead-1", LEAD, "en");
    session.history.push({ role: "assistant", content: "Hi!" });
    expect(getSmsSession(LEAD.phone)?.history).toHaveLength(1);
  });
});
