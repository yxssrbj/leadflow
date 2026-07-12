"use client";

import { useState } from "react";
import ChatUI from "@/components/chat/ChatUI";
import type { ChatMessage, Lead } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locales";
import type { DemoBusiness } from "./DemoTabs";
import { track } from "@/lib/analytics";

interface Booking {
  slot: string;
  issue_summary: string;
  name: string;
  phone: string;
}

export default function OutboundDemo({
  initialDeadLeads,
  locale,
  dict,
  business,
}: {
  initialDeadLeads: Lead[];
  locale: Locale;
  dict: Dictionary;
  business: DemoBusiness;
}) {
  const t = dict.outboundDemo;
  const persona = business.personas.outbound;
  const [deadLeads, setDeadLeads] = useState<Lead[]>(initialDeadLeads);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [closed, setClosed] = useState<{ reason: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reseeding, setReseeding] = useState(false);

  async function callAgent(nextHistory: ChatMessage[], lead: Lead) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agents/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, history: nextHistory, language: locale, businessId: business.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t.genericError);
        return;
      }
      track("chat_turn", { agent: "outbound", locale, business: business.id });
      if (data.reply) setHistory((h) => [...h, { role: "assistant", content: data.reply }]);
      if (data.booking) {
        setBooking(data.booking);
        track("booking_completed", { agent: "outbound", locale, business: business.id });
      }
      if (data.closed) {
        setClosed(data.closed);
        track("lead_closed", { agent: "outbound", locale, business: business.id });
      }
    } catch {
      setError(t.agentConnectError);
    } finally {
      setLoading(false);
    }
  }

  async function refreshDeadLeads() {
    try {
      const res = await fetch(`/api/leads?status=dead&business=${encodeURIComponent(business.id)}`);
      const data = await res.json();
      if (res.ok) setDeadLeads(data.leads);
    } catch {
      // keep the stale list if the refresh fails
    }
  }

  async function reset() {
    setSelected(null);
    setHistory([]);
    setBooking(null);
    setClosed(null);
    setError(null);
    await refreshDeadLeads();
  }

  // Puts the seeded demo data back — replaces the old "delete db.json and
  // restart the server" instruction, which had no place in a live pitch.
  async function reseed() {
    setReseeding(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: business.id }),
      });
      if (!res.ok) throw new Error("reset failed");
      await refreshDeadLeads();
    } catch {
      setError(t.reseedError);
    } finally {
      setReseeding(false);
    }
  }

  function launch(lead: Lead) {
    setSelected(lead);
    setHistory([]);
    setBooking(null);
    setClosed(null);
    void callAgent([], lead);
  }

  if (!selected) {
    return (
      <div className="glass w-full rounded-3xl p-7 shadow-2xl">
        <h3 className="font-display text-lg font-semibold text-hi">{t.listTitle}</h3>
        <p className="mt-2 text-sm leading-6 text-mid">{t.listSubtitle}</p>
        <div className="mt-5 flex flex-col gap-3">
          {deadLeads.length === 0 && (
            <div className="rounded-2xl border border-line bg-white/[0.02] px-4 py-6 text-center">
              <p className="text-sm leading-6 text-mid">{t.emptyState}</p>
              <button
                onClick={() => void reseed()}
                disabled={reseeding}
                className="mt-4 rounded-full bg-ember px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:brightness-110 disabled:opacity-40"
              >
                {t.reseedCta}
              </button>
            </div>
          )}
          {error && !selected && (
            <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-xs text-red-300">
              {error}
            </p>
          )}
          {deadLeads.map((lead) => (
            <button
              key={lead.id}
              onClick={() => launch(lead)}
              className="group flex flex-col rounded-2xl border border-line bg-white/[0.02] p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-ember-600/50"
            >
              <div className="flex w-full items-center justify-between">
                <p className="font-semibold text-hi">{lead.name}</p>
                <span className="rounded-full border border-line px-2.5 py-1 text-xs text-mid transition-all duration-300 group-hover:border-transparent group-hover:bg-ember group-hover:text-white">
                  {t.reachOut}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-mid">{lead.need}</p>
              <p className="mt-2 text-xs text-low">
                {t.lastContact}{" "}
                {new Date(lead.lastContactAt).toLocaleDateString(locale === "en" ? "en-US" : "pl-PL", {
                  day: "numeric",
                  month: "short",
                })}{" "}
                · {lead.phone}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <ChatUI
      title={`${persona} → ${selected.name}`}
      subtitle={t.chatSubtitle}
      dict={dict}
      messages={history}
      loading={loading}
      error={error}
      resultCard={
        booking ? (
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            <p className="font-semibold">{t.resultBookedTitle}</p>
            <p className="mt-0.5">{booking.slot}</p>
            <p className="text-xs opacity-75">{booking.issue_summary}</p>
          </div>
        ) : closed ? (
          <div className="rounded-2xl border border-line-strong bg-white/[0.04] px-4 py-3 text-sm text-mid">
            <p className="font-semibold text-hi">{t.resultClosedTitle}</p>
            <p className="mt-0.5 text-xs opacity-80">{closed.reason}</p>
          </div>
        ) : undefined
      }
      inputDisabled={loading || !!booking || !!closed}
      placeholder={booking || closed ? t.placeholderDone : `${t.placeholderDefaultPrefix}${selected.name}${t.placeholderDefaultSuffix}`}
      typingLabel={`${persona} ${t.typingSuffix}`}
      onSend={(text) => {
        const next: ChatMessage[] = [...history, { role: "user", content: text }];
        setHistory(next);
        void callAgent(next, selected);
      }}
      onRestart={() => void reset()}
    />
  );
}
