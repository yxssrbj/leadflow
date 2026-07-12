"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { isLocale } from "@/lib/i18n/locales";

// Segment error boundary — replaces the page content (Nav/Footer survive)
// with a branded fallback instead of Next's unstyled default mid-pitch.
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams<{ locale: string }>();
  const locale = isLocale(params.locale) ? params.locale : "pl";
  const t = getDictionary(locale).errors;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-32">
      <div className="text-center">
        <p className="font-display text-6xl font-bold text-ember">!</p>
        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-hi">{t.errorTitle}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-mid">{t.errorText}</p>
        <button
          onClick={reset}
          className="mt-8 rounded-full bg-ember px-7 py-3 text-sm font-semibold text-white transition-all duration-300 hover:glow-ember hover:brightness-110"
        >
          {t.retryCta}
        </button>
      </div>
    </div>
  );
}
