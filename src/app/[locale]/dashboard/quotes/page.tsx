import Link from "next/link";
import { notFound } from "next/navigation";
import { getQuotes } from "@/lib/crm";
import { DEFAULT_BUSINESS_ID } from "@/lib/agents/configs";
import { formatCurrency, formatDate } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { isLocale, type Locale } from "@/lib/i18n/locales";
import { getSessionBusinessId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function QuotesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const dict = getDictionary(locale);
  const t = dict.dashboardQuotes;

  const session = await getSessionBusinessId();
  if (!session) notFound(); // dashboard/layout.tsx already gates this
  const { businessId } = session;
  const quotes = await getQuotes(businessId);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-hi">{t.title}</h1>
        <p className="mt-2 text-sm leading-6 text-mid">{t.subtitle}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {quotes.map((q) => (
          <div
            key={q.id}
            className="glass rounded-3xl p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-ember-600/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display font-semibold text-hi">{q.customerName}</p>
                <p className="mt-0.5 text-xs text-low">
                  {q.phone} · {formatDate(q.createdAt, locale)}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
                {q.jobType}
              </span>
            </div>
            <div className="mt-5 space-y-2 text-sm">
              {q.lineItems.map((li, i) => (
                <div key={i} className="flex justify-between gap-4">
                  <span className="text-mid">{li.description}</span>
                  <span className="shrink-0 font-medium text-hi tabular-nums">
                    {formatCurrency(li.amount, locale)}
                  </span>
                </div>
              ))}
            </div>
            <div className="hairline mt-4" />
            <div className="flex justify-between pt-4 font-bold text-hi">
              <span>{t.total}</span>
              <span className="font-display tabular-nums">{formatCurrency(q.total, locale)}</span>
            </div>
            <p className="mt-3 text-xs leading-5 text-low">{q.notes}</p>
          </div>
        ))}
        {quotes.length === 0 && (
          <p className="col-span-full rounded-3xl border border-dashed border-line-strong px-6 py-14 text-center text-sm text-low">
            {t.emptyPrefix}{" "}
            <Link
              href={`/${locale}/demo?tab=quotation${businessId === DEFAULT_BUSINESS_ID ? "" : `&business=${businessId}`}`}
              className="font-semibold text-ember-400 underline-offset-4 hover:underline"
            >
              {t.emptyLink}
            </Link>
            {t.emptySuffix}
          </p>
        )}
      </div>
    </div>
  );
}
