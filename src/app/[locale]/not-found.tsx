"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { isLocale } from "@/lib/i18n/locales";

// Branded 404, rendered inside the locale layout (Nav/Footer stay). Client
// component on purpose: not-found.tsx gets no `params`, so the locale comes
// from useParams() instead. Reached via the [...rest] catch-all route.
export default function LocaleNotFound() {
  const params = useParams<{ locale: string }>();
  const locale = isLocale(params.locale ?? "") ? params.locale : "pl";
  const t = getDictionary(locale as "pl" | "en").errors;

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-32">
      <div className="text-center">
        <p className="font-display text-7xl font-bold tracking-tight text-ember">404</p>
        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-hi">{t.notFoundTitle}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-mid">{t.notFoundText}</p>
        <Link
          href={`/${locale}`}
          className="mt-8 inline-block rounded-full bg-ember px-7 py-3 text-sm font-semibold text-white transition-all duration-300 hover:glow-ember hover:brightness-110"
        >
          {t.notFoundCta}
        </Link>
      </div>
    </div>
  );
}
