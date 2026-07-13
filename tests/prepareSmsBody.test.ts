import { describe, expect, it } from "vitest";
import { prepareSmsBody } from "@/lib/twilio";

describe("prepareSmsBody", () => {
  it("strips Polish diacritics so the message stays GSM-7 encoded", () => {
    expect(prepareSmsBody("Dzień dobry, tu Ola z SolarTech Kraków. Świetnie!")).toBe(
      "Dzien dobry, tu Ola z SolarTech Krakow. Swietnie!",
    );
  });

  it("replaces typographic quotes and dashes with GSM-safe equivalents", () => {
    expect(prepareSmsBody("Pisze Pan w sprawie: „fotowoltaika” — super…")).toBe(
      'Pisze Pan w sprawie: "fotowoltaika" - super...',
    );
  });

  it("collapses whitespace", () => {
    expect(prepareSmsBody("Dzien  dobry,\n\ntu Ola")).toBe("Dzien dobry, tu Ola");
  });

  it("truncates long messages to the trial-safe single-segment budget", () => {
    const long = "a".repeat(50) + " " + "b".repeat(200);
    const out = prepareSmsBody(long);
    expect(out.length).toBeLessThanOrEqual(120);
    expect(out.endsWith("...")).toBe(true);
  });

  it("leaves short GSM-safe messages untouched", () => {
    expect(prepareSmsBody("Pasuje pon. 9:00?")).toBe("Pasuje pon. 9:00?");
  });
});
