import Link from "next/link";
import { notFound } from "next/navigation";
import { getAppointments, getLeads, getQuotes } from "@/lib/crm";
import { formatCurrency, formatDate } from "@/lib/format";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { isLocale, type Locale } from "@/lib/i18n/locales";
import { getSessionBusinessId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardOverview({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const dict = getDictionary(locale);
  const t = dict.dashboardOverview;

  const session = await getSessionBusinessId();
  if (!session) notFound(); // dashboard/layout.tsx already gates this
  const { businessId } = session;

  const [leads, appointments, quotes] = await Promise.all([
    getLeads(businessId),
    getAppointments(businessId),
    getQuotes(businessId),
  ]);

  const quoteValue = quotes.reduce((sum, q) => sum + q.total, 0);
  const activeLeads = leads.filter((l) => !["dead", "closed"].includes(l.status)).length;

  const stats = [
    { label: t.statActiveLeads, value: String(activeLeads), href: `/${locale}/dashboard/leads` },
    { label: t.statAppointments, value: String(appointments.length), href: `/${locale}/dashboard/appointments` },
    { label: t.statQuotes, value: String(quotes.length), href: `/${locale}/dashboard/quotes` },
    { label: t.statQuoteValue, value: formatCurrency(quoteValue, locale), href: `/${locale}/dashboard/quotes` },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-hi">{t.title}</h1>
        <p className="mt-2 text-sm leading-6 text-mid">
          {t.subtitlePrefix}{" "}
          <Link
            href={`/${locale}/demo`}
            className="font-semibold text-ember-400 underline-offset-4 hover:underline"
          >
            {t.subtitleLink}
          </Link>{" "}
          {t.subtitleSuffix}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group glass rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-ember-600/40"
          >
            <p className="font-display text-[1.7rem] leading-tight font-bold tracking-tight text-hi tabular-nums transition-colors duration-300 group-hover:text-ember-400">
              {s.value}
            </p>
            <p className="mt-1.5 text-xs text-mid">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-hi">{t.recentLeads}</h2>
            <Link
              href={`/${locale}/dashboard/leads`}
              className="text-xs font-semibold text-ember-400 underline-offset-4 hover:underline"
            >
              {t.viewAll}
            </Link>
          </div>
          <div className="mt-4 flex flex-col divide-y divide-white/5">
            {leads.slice(0, 5).map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-hi">{l.name}</p>
                  <p className="truncate text-xs text-low">{l.need}</p>
                </div>
                <StatusBadge status={l.status} dict={dict} />
              </div>
            ))}
            {leads.length === 0 && <p className="py-8 text-center text-sm text-low">{t.noLeads}</p>}
          </div>
        </section>

        <section className="glass rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-hi">{t.upcomingAppointments}</h2>
            <Link
              href={`/${locale}/dashboard/appointments`}
              className="text-xs font-semibold text-ember-400 underline-offset-4 hover:underline"
            >
              {t.viewAll}
            </Link>
          </div>
          <div className="mt-4 flex flex-col divide-y divide-white/5">
            {appointments.slice(0, 5).map((a) => (
              <div key={a.id} className="py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-hi">{a.leadName}</p>
                  <p className="shrink-0 rounded-full border border-ember-600/30 bg-ember-600/10 px-2.5 py-0.5 text-xs font-semibold text-ember-400">
                    {a.slot}
                  </p>
                </div>
                <p className="mt-1 truncate text-xs text-mid">{a.issueSummary}</p>
                <p className="mt-1 text-xs text-low">
                  {t.bookedBy} ({a.agent}) · {formatDate(a.createdAt, locale)}
                </p>
              </div>
            ))}
            {appointments.length === 0 && (
              <p className="py-8 text-center text-sm text-low">{t.noAppointments}</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
