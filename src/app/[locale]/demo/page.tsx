import Link from "next/link";
import { notFound } from "next/navigation";
import DemoTabs, { type DemoBusiness, type DemoTab } from "@/components/demos/DemoTabs";
import KokoroVoiceTest from "@/components/demos/KokoroVoiceTest";
import { getLeads } from "@/lib/crm";
import { getBusinessConfig, DEFAULT_BUSINESS_ID, isBusinessId } from "@/lib/agents/configs";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { isLocale, type Locale } from "@/lib/i18n/locales";

export const dynamic = "force-dynamic";

const VALID_TABS: DemoTab[] = ["speed-to-lead", "quotation", "outbound"];

export default async function DemoPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; business?: string; dev?: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const dict = getDictionary(locale);

  const { tab, business: businessParam, dev } = await searchParams;
  const initialTab: DemoTab = VALID_TABS.includes(tab as DemoTab)
    ? (tab as DemoTab)
    : "speed-to-lead";

  // ?business=<id> switches every agent to another registered BusinessConfig
  // (e.g. budmax-remont) — this is how the "same agents, different vertical"
  // pitch is shown live. Unknown ids fall back to the default silently.
  const businessId =
    businessParam && (await isBusinessId(businessParam)) ? businessParam : DEFAULT_BUSINESS_ID;
  const config = await getBusinessConfig(businessId);
  const business: DemoBusiness = {
    id: config.id,
    name: config.businessName,
    personas: {
      speedToLead: config.agents.speedToLead.name,
      quotation: config.agents.quotation.name,
      outbound: config.agents.outbound.name,
    },
  };

  const deadLeads = (await getLeads(businessId)).filter((l) => l.status === "dead");

  // Internal voice-quality widget — never shown on a prospect-facing link.
  const showKokoro = process.env.NODE_ENV === "development" || dev === "1";

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[32rem]"
        style={{
          background: "radial-gradient(55% 60% at 50% 0%, rgba(255,106,31,0.09) 0%, transparent 70%)",
        }}
      />
      <div className="relative mx-auto w-full max-w-6xl px-6 pt-32 pb-20">
        <div className="max-w-2xl">
          <p className="rise-in inline-flex items-center gap-3 text-xs font-bold tracking-[0.25em] text-ember-500 uppercase">
            <span className="hairline w-8" />
            {dict.demoPage.eyebrow}
          </p>
          <h1 className="rise-in rise-in-1 mt-5 font-display text-4xl font-bold tracking-tight text-hi sm:text-5xl">
            {dict.demoPage.title}
          </h1>
          <p className="rise-in rise-in-2 mt-4 leading-7 text-mid">
            {dict.demoPage.subtitlePrefix}{" "}
            <Link
              href={`/${locale}/dashboard`}
              className="font-semibold text-ember-400 underline-offset-4 hover:underline"
            >
              {dict.demoPage.subtitleLink}
            </Link>
            {dict.demoPage.subtitleSuffix}
          </p>
          {business.id !== DEFAULT_BUSINESS_ID && (
            <p className="rise-in rise-in-2 mt-4 inline-flex items-center gap-2 rounded-full border border-ember-600/30 bg-ember-600/10 px-4 py-1.5 text-xs font-semibold text-ember-400">
              {dict.demoPage.businessLabel} {business.name}
            </p>
          )}
        </div>
        <div className="rise-in rise-in-3 mt-12">
          <DemoTabs
            initialTab={initialTab}
            deadLeads={deadLeads}
            locale={locale}
            dict={dict}
            business={business}
          />
        </div>
        {showKokoro && (
          <div className="mt-20 max-w-2xl">
            <KokoroVoiceTest dict={dict} />
          </div>
        )}
      </div>
    </div>
  );
}
