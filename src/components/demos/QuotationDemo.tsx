"use client";

import { FormEvent, useState } from "react";
import ChatUI from "@/components/chat/ChatUI";
import { formatCurrency } from "@/lib/format";
import type { ChatMessage, Quote } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locales";
import type { DemoBusiness } from "./DemoTabs";
import { track } from "@/lib/analytics";

interface CustomerInfo {
  name: string;
  phone: string;
  jobType: string;
  details: string;
}

export default function QuotationDemo({
  locale,
  dict,
  business,
}: {
  locale: Locale;
  dict: Dictionary;
  business: DemoBusiness;
}) {
  const t = dict.quotationDemo;
  const persona = business.personas.quotation;
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function callAgent(nextHistory: ChatMessage[], info: CustomerInfo) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agents/quotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer: info, history: nextHistory, language: locale, businessId: business.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t.genericError);
        return;
      }
      track("chat_turn", { agent: "quotation", locale, business: business.id });
      if (data.reply) setHistory((h) => [...h, { role: "assistant", content: data.reply }]);
      if (data.quote) {
        setQuote(data.quote);
        track("quote_completed", { agent: "quotation", locale, business: business.id });
      }
    } catch {
      setError(t.agentConnectError);
    } finally {
      setLoading(false);
    }
  }

  function handleIntake(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const info: CustomerInfo = {
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      jobType: String(form.get("jobType") ?? ""),
      details: String(form.get("details") ?? ""),
    };
    setCustomer(info);
    setHistory([]);
    setQuote(null);
    void callAgent([], info);
  }

  function reset() {
    setCustomer(null);
    setHistory([]);
    setQuote(null);
    setError(null);
  }

  if (!customer) {
    return (
      <div className="glass w-full rounded-3xl p-7 shadow-2xl">
        <h3 className="font-display text-lg font-semibold text-hi">{t.formTitle}</h3>
        <p className="mt-2 text-sm leading-6 text-mid">
          {t.formSubtitlePrefix}
          {persona}
          {t.formSubtitleSuffix}
        </p>
        <form onSubmit={handleIntake} className="mt-5 flex flex-col gap-3">
          <input name="name" required placeholder={t.namePlaceholder} defaultValue={t.nameDefault} className="field" />
          <input name="phone" required placeholder={t.phonePlaceholder} defaultValue={t.phoneDefault} className="field" />
          <select name="jobType" required defaultValue={t.jobTypeOptions[0]} className="field">
            {t.jobTypeOptions.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          <textarea
            name="details"
            required
            rows={2}
            placeholder={t.detailsPlaceholder}
            defaultValue={t.detailsDefault}
            className="field resize-none"
          />
          <button
            type="submit"
            className="mt-1 rounded-full bg-ember px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:glow-ember hover:brightness-110"
          >
            {t.submit}
          </button>
        </form>
      </div>
    );
  }

  return (
    <ChatUI
      title={`${persona} · ${business.name}`}
      subtitle={t.chatSubtitle}
      dict={dict}
      intro={
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl rounded-br-md bg-ember px-4 py-2.5 text-sm leading-relaxed text-white">
            {customer.jobType}: {customer.details}
          </div>
        </div>
      }
      messages={history}
      loading={loading}
      error={error}
      resultCard={
        quote && (
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            <p className="font-semibold">{t.resultTitlePrefix}{quote.jobType}</p>
            <div className="mt-3 space-y-1.5">
              {quote.lineItems.map((li, i) => (
                <div key={i} className="flex justify-between gap-4">
                  <span className="opacity-85">{li.description}</span>
                  <span className="shrink-0 font-medium tabular-nums">{formatCurrency(li.amount, locale)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t border-emerald-500/25 pt-2.5 font-bold">
              <span>{t.total}</span>
              <span className="tabular-nums">{formatCurrency(quote.total, locale)}</span>
            </div>
            <p className="mt-2.5 text-xs opacity-75">{quote.notes}</p>
          </div>
        )
      }
      inputDisabled={loading || !!quote}
      placeholder={quote ? t.placeholderQuoted : t.placeholderDefault}
      typingLabel={`${persona} ${t.typingSuffix}`}
      onSend={(text) => {
        const next: ChatMessage[] = [...history, { role: "user", content: text }];
        setHistory(next);
        void callAgent(next, customer);
      }}
      onRestart={reset}
    />
  );
}
