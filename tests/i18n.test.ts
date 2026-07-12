import { describe, expect, it } from "vitest";
import pl from "@/lib/i18n/dictionaries/pl";
import en from "@/lib/i18n/dictionaries/en";

// TypeScript already guarantees en has every key pl has (en is `typeof pl`),
// but it can't catch runtime-shape drift inside arrays or empty values. This
// walk does.

type Tree = Record<string, unknown>;

function walk(a: unknown, b: unknown, path: string, problems: string[]) {
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) {
      problems.push(`${path}: pl is an array, en is not`);
      return;
    }
    if (a.length !== b.length) {
      problems.push(`${path}: array length ${a.length} (pl) vs ${b.length} (en)`);
      return;
    }
    a.forEach((item, i) => walk(item, b[i], `${path}[${i}]`, problems));
    return;
  }
  if (a && typeof a === "object") {
    for (const key of Object.keys(a as Tree)) {
      walk((a as Tree)[key], (b as Tree | undefined)?.[key], `${path}.${key}`, problems);
    }
    return;
  }
  if (typeof a === "string") {
    if (typeof b !== "string") {
      problems.push(`${path}: pl is a string, en is ${typeof b}`);
    } else if (a.trim() !== "" && b.trim() === "") {
      problems.push(`${path}: en value is empty`);
    }
  }
}

describe("pl/en dictionary parity", () => {
  it("has identical structure, matching array lengths, and no empty en strings", () => {
    const problems: string[] = [];
    walk(pl, en, "dict", problems);
    expect(problems).toEqual([]);
  });

  it("keeps the demo tab ids stable across languages", () => {
    expect(pl.demoTabs.map((t) => t.id)).toEqual(en.demoTabs.map((t) => t.id));
    expect(pl.demoTabs.map((t) => t.id)).toEqual(["speed-to-lead", "quotation", "outbound"]);
  });

  it("keeps status/source/agent label keys aligned with the domain unions", () => {
    const statuses = ["new", "qualified", "booked", "quoted", "dead", "revived", "closed"];
    for (const s of statuses) {
      expect(pl.statusLabels[s], `pl statusLabels.${s}`).toBeTruthy();
      expect(en.statusLabels[s], `en statusLabels.${s}`).toBeTruthy();
    }
  });
});
