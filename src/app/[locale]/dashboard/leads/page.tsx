import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeads } from "@/lib/crm";
import { formatDate } from "@/lib/format";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { isLocale, type Locale } from "@/lib/i18n/locales";
import { getSessionBusinessId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LeadsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const dict = getDictionary(locale);
  const t = dict.dashboardLeads;

  const session = await getSessionBusinessId();
  if (!session) notFound(); // dashboard/layout.tsx already gates this
  const { businessId } = session;
  const leads = await getLeads(businessId);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-hi">{t.title}</h1>
        <p className="mt-2 text-sm leading-6 text-mid">{t.subtitle}</p>
      </div>

      <div className="glass overflow-x-auto rounded-3xl">
        <table className="w-full min-w-[42rem] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-[11px] tracking-[0.15em] text-low uppercase">
              <th className="px-6 py-4 font-bold">{t.colLead}</th>
              <th className="px-6 py-4 font-bold">{t.colInquiry}</th>
              <th className="px-6 py-4 font-bold">{t.colSource}</th>
              <th className="px-6 py-4 font-bold">{t.colStatus}</th>
              <th className="px-6 py-4 font-bold">{t.colLastContact}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {leads.map((l) => (
              <tr key={l.id} className="transition-colors duration-200 hover:bg-white/[0.025]">
                <td className="px-6 py-4">
                  <p className="font-medium text-hi">{l.name}</p>
                  <p className="text-xs text-low">{l.phone}</p>
                </td>
                <td className="max-w-xs px-6 py-4">
                  <p className="truncate text-mid" title={l.need}>
                    {l.need}
                  </p>
                </td>
                <td className="px-6 py-4 text-mid">{t.sourceLabels[l.source] ?? l.source}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={l.status} dict={dict} />
                </td>
                <td className="px-6 py-4 text-mid tabular-nums">{formatDate(l.lastContactAt, locale)}</td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-low">
                  {t.emptyPrefix}{" "}
                  <Link
                    href={`/${locale}/demo`}
                    className="font-semibold text-ember-400 underline-offset-4 hover:underline"
                  >
                    {t.emptyLink}
                  </Link>
                  {t.emptySuffix}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
