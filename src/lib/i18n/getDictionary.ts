import type { Locale } from "./locales";
import pl from "./dictionaries/pl";
import en from "./dictionaries/en";

const DICTIONARIES = { pl, en } satisfies Record<Locale, typeof pl>;

export type Dictionary = typeof pl;

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}
