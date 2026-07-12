"use client";

import { useEffect, useRef, useState } from "react";
import SpeedToLeadDemo from "./SpeedToLeadDemo";
import QuotationDemo from "./QuotationDemo";
import OutboundDemo from "./OutboundDemo";
import type { Lead } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locales";
import { track } from "@/lib/analytics";

export type DemoTab = "speed-to-lead" | "quotation" | "outbound";

// The slice of a BusinessConfig the client demo needs — resolved server-side
// on the demo page (from ?business=) and passed down as plain props.
export interface DemoBusiness {
  id: string;
  name: string;
  personas: { speedToLead: string; quotation: string; outbound: string };
}

export default function DemoTabs({
  initialTab,
  deadLeads,
  locale,
  dict,
  business,
}: {
  initialTab: DemoTab;
  deadLeads: Lead[];
  locale: Locale;
  dict: Dictionary;
  business: DemoBusiness;
}) {
  const [active, setActive] = useState<DemoTab>(initialTab);
  const tabs = dict.demoTabs as { id: DemoTab; label: string; agent: string; blurb: string }[];
  const current = tabs.find((t) => t.id === active)!;
  const opened = useRef(false);

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    track("demo_opened", { tab: initialTab, locale, business: business.id });
  }, [initialTab, locale, business.id]);

  function select(tab: DemoTab) {
    setActive(tab);
    track("tab_selected", { tab, locale, business: business.id });
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="glass inline-flex w-fit flex-wrap gap-1 rounded-full p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => select(t.id)}
            aria-pressed={active === t.id}
            className={`rounded-full px-4.5 py-2 text-sm font-semibold transition-all duration-300 ${
              active === t.id ? "bg-ember text-white" : "text-mid hover:text-hi"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="max-w-2xl text-sm leading-7 text-mid">{current.blurb}</p>
      <div className="mx-auto w-full max-w-md">
        {active === "speed-to-lead" && <SpeedToLeadDemo locale={locale} dict={dict} business={business} />}
        {active === "quotation" && <QuotationDemo locale={locale} dict={dict} business={business} />}
        {active === "outbound" && (
          <OutboundDemo initialDeadLeads={deadLeads} locale={locale} dict={dict} business={business} />
        )}
      </div>
    </div>
  );
}
