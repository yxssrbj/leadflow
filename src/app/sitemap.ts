import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { LOCALES } from "@/lib/i18n/locales";

// Public, indexable pages only — the demo and dashboard are deliberately
// excluded (they're pitch surfaces, not content to rank).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return LOCALES.map((locale) => ({
    url: `${SITE_URL}/${locale}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: locale === "pl" ? 1 : 0.9,
    alternates: {
      languages: Object.fromEntries(LOCALES.map((l) => [l, `${SITE_URL}/${l}`])),
    },
  }));
}
