import Link from "next/link";
import { notFound } from "next/navigation";
import { getAppointments } from "@/lib/crm";
import { getBusinessConfig } from "@/lib/agents/configs";
import { formatDate } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { isLocale, type Locale } from "@/lib/i18n/locales";
import { getSessionBusinessId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const dict = getDictionary(locale);
  const t = dict.dashboardAppointments;

  const session = await getSessionBusinessId();
  if (!session) notFound(); // dashboard/layout.tsx already gates this
  const { businessId } = session;
  const [appointments, business] = await Promise.all([
    getAppointments(businessId),
    getBusinessConfig(businessId),
  ]);
  const agentNames: Record<string, string> = {
    "speed-to-lead": business.agents.speedToLead.name,
    quotation: business.agents.quotation.name,
    outbound: business.agents.outbound.name,
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-hi">{t.title}</h1>
        <p className="mt-2 text-sm leading-6 text-mid">{t.subtitle}</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {appointments.map((a) => (
          <div
            key={a.id}
            className="glass rounded-3xl p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-ember-600/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display font-semibold text-hi">{a.leadName}</p>
                <p className="mt-0.5 text-xs text-low">{a.phone}</p>
              </div>
              <span className="shrink-0 rounded-full border border-ember-600/30 bg-ember-600/10 px-3 py-1 text-xs font-semibold text-ember-400">
                {a.slot}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-mid">{a.issueSummary}</p>
            <div className="hairline mt-5" />
            <p className="pt-4 text-xs text-low">
              {t.bookedBy}: {agentNames[a.agent] ?? a.agent} · {t.agentLabels[a.agent] ?? a.agent} ·{" "}
              {formatDate(a.createdAt, locale)}
            </p>
          </div>
        ))}
        {appointments.length === 0 && (
          <p className="col-span-full rounded-3xl border border-dashed border-line-strong px-6 py-14 text-center text-sm text-low">
            {t.emptyPrefix}{" "}
            <Link
              href={`/${locale}/demo`}
              className="font-semibold text-ember-400 underline-offset-4 hover:underline"
            >
              {t.emptyLink}
            </Link>{" "}
            {t.emptySuffix}
          </p>
        )}
      </div>
    </div>
  );
}
