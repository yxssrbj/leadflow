import { notFound } from "next/navigation";
import { getEvents } from "@/lib/db";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { isLocale, type Locale } from "@/lib/i18n/locales";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const dict = getDictionary(locale);
  const t = dict.dashboardAnalytics;

  const events = getEvents();
  const sessions = new Set(events.map((e) => e.session)).size;
  const count = (name: string) => events.filter((e) => e.name === name).length;

  const stats = [
    { label: t.statSessions, value: sessions },
    { label: t.statChatTurns, value: count("chat_turn") },
    { label: t.statBookings, value: count("booking_completed") },
    { label: t.statQuotes, value: count("quote_completed") },
  ];

  // Tab opens by tab id (from demo_opened initial tab + explicit tab clicks).
  const tabCounts = new Map<string, number>();
  for (const e of events) {
    if (e.name !== "tab_selected" && e.name !== "demo_opened") continue;
    const tab = e.meta?.tab ?? "?";
    tabCounts.set(tab, (tabCounts.get(tab) ?? 0) + 1);
  }

  const eventCounts = new Map<string, number>();
  for (const e of events) {
    eventCounts.set(e.name, (eventCounts.get(e.name) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-hi">{t.title}</h1>
        <p className="mt-2 text-sm leading-6 text-mid">{t.subtitle}</p>
      </div>

      {events.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line-strong px-6 py-14 text-center text-sm text-low">
          {t.empty}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="glass rounded-2xl p-5">
                <p className="font-display text-[1.7rem] leading-tight font-bold tracking-tight text-hi tabular-nums">
                  {s.value}
                </p>
                <p className="mt-1.5 text-xs text-mid">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="glass rounded-3xl p-6">
              <h2 className="font-display font-semibold text-hi">{t.byTabHeading}</h2>
              <div className="mt-4 flex flex-col gap-3">
                {[...tabCounts.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .map(([tab, n]) => {
                    const max = Math.max(...tabCounts.values());
                    return (
                      <div key={tab}>
                        <div className="flex justify-between text-sm">
                          <span className="text-mid">{tab}</span>
                          <span className="font-medium text-hi tabular-nums">{n}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                          <div className="h-full rounded-full bg-ember" style={{ width: `${(n / max) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>

            <section className="glass rounded-3xl p-6">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-[11px] tracking-[0.15em] text-low uppercase">
                    <th className="py-3 font-bold">{t.tableEvent}</th>
                    <th className="py-3 text-right font-bold">{t.tableCount}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[...eventCounts.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, n]) => (
                      <tr key={name}>
                        <td className="py-3 font-mono text-xs text-mid">{name}</td>
                        <td className="py-3 text-right font-medium text-hi tabular-nums">{n}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
