import { afterEach, describe, expect, it } from "vitest";
import { shouldUseKokoro } from "@/lib/twilio";

// Kokoro is an opt-in extra TTS server (KOKORO_URL) — English calls must not
// try to reach it unless it's actually configured, or they 502 in any
// environment (like a fresh Vercel deploy) that hasn't stood one up. See
// lib/twilio.ts#shouldUseKokoro.
describe("shouldUseKokoro", () => {
  afterEach(() => {
    delete process.env.KOKORO_URL;
  });

  it("never uses Kokoro for Polish, regardless of KOKORO_URL", () => {
    process.env.KOKORO_URL = "https://kokoro.example.com";
    expect(shouldUseKokoro("pl")).toBe(false);
  });

  it("does not use Kokoro for English when KOKORO_URL is unset", () => {
    delete process.env.KOKORO_URL;
    expect(shouldUseKokoro("en")).toBe(false);
  });

  it("uses Kokoro for English once KOKORO_URL is configured", () => {
    process.env.KOKORO_URL = "https://kokoro.example.com";
    expect(shouldUseKokoro("en")).toBe(true);
  });
});
