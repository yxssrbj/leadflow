"use client";

import { FormEvent, useRef, useState } from "react";
import ChatUI from "@/components/chat/ChatUI";
import type { ChatMessage } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locales";
import type { DemoBusiness } from "./DemoTabs";
import { track } from "@/lib/analytics";

interface Booking {
  slot: string;
  name: string;
  phone: string;
  issue_summary: string;
}

interface LeadInfo {
  name: string;
  phone: string;
  need: string;
}

export default function SpeedToLeadDemo({
  locale,
  dict,
  business,
}: {
  locale: Locale;
  dict: Dictionary;
  business: DemoBusiness;
}) {
  const t = dict.speedToLeadDemo;
  const persona = business.personas.speedToLead;
  const [lead, setLead] = useState<LeadInfo | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [callState, setCallState] = useState<{ status: "idle" | "calling" | "ringing" | "error"; message?: string }>({
    status: "idle",
  });
  const [pinRequired, setPinRequired] = useState(false);
  const [pin, setPin] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  async function callAgent(nextHistory: ChatMessage[], leadInfo: LeadInfo, id: string | null) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agents/speed-to-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead: leadInfo,
          history: nextHistory,
          leadId: id,
          language: locale,
          businessId: business.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t.genericError);
        return;
      }
      track("chat_turn", { agent: "speed-to-lead", locale, business: business.id });
      if (data.leadId) setLeadId(data.leadId);
      if (data.reply) setHistory((h) => [...h, { role: "assistant", content: data.reply }]);
      if (data.booking) {
        setBooking(data.booking);
        track("booking_completed", { agent: "speed-to-lead", locale, business: business.id });
      }
    } catch {
      setError(t.agentConnectError);
    } finally {
      setLoading(false);
    }
  }

  function readLeadFromForm(): LeadInfo | null {
    if (!formRef.current) return null;
    const form = new FormData(formRef.current);
    return {
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      need: String(form.get("need") ?? ""),
    };
  }

  function handleIntake(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const info = readLeadFromForm();
    if (!info) return;
    setLead(info);
    setHistory([]);
    setBooking(null);
    void callAgent([], info, null);
  }

  async function handleRealCall() {
    const info = readLeadFromForm();
    if (!info) return;
    setCallState({ status: "calling" });
    try {
      const res = await fetch("/api/voice/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead: info, pin }),
      });
      const data = await res.json();
      if (res.status === 401 && data.pinRequired) {
        // Server wants the demo PIN — reveal the input and let them retry.
        setPinRequired(true);
        setCallState({ status: "idle" });
        return;
      }
      if (!res.ok) {
        setCallState({ status: "error", message: data.error ?? t.callError });
        return;
      }
      track("call_requested", { locale, business: business.id });
      setCallState({ status: "ringing", message: `${t.ringingMessagePrefix}${info.phone}${t.ringingMessageSuffix}` });
    } catch {
      setCallState({ status: "error", message: t.connectError });
    }
  }

  function reset() {
    setLead(null);
    setLeadId(null);
    setHistory([]);
    setBooking(null);
    setError(null);
  }

  if (!lead) {
    return (
      <div className="glass w-full rounded-3xl p-7 shadow-2xl">
        <h3 className="font-display text-lg font-semibold text-hi">{t.formTitle}</h3>
        <p className="mt-2 text-sm leading-6 text-mid">
          {t.formSubtitlePrefix}
          {business.name}
          {t.formSubtitleMid}
          {persona}
          {t.formSubtitleSuffix}
        </p>
        <form ref={formRef} onSubmit={handleIntake} className="mt-5 flex flex-col gap-3">
          <input name="name" required placeholder={t.namePlaceholder} defaultValue={t.nameDefault} className="field" />
          <input name="phone" required placeholder={t.phonePlaceholder} defaultValue={t.phoneDefault} className="field" />
          <textarea
            name="need"
            required
            rows={2}
            placeholder={t.needPlaceholder}
            defaultValue={t.needDefault}
            className="field resize-none"
          />
          <button
            type="submit"
            className="mt-1 rounded-full bg-ember px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:glow-ember hover:brightness-110"
          >
            {t.submit}
          </button>
          {pinRequired && (
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder={t.pinPlaceholder}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="field"
            />
          )}
          <button
            type="button"
            onClick={() => void handleRealCall()}
            disabled={callState.status === "calling" || callState.status === "ringing"}
            className="rounded-full border border-line-strong px-5 py-3 text-sm font-semibold text-mid transition-all duration-300 hover:border-ember-500/60 hover:text-hi disabled:opacity-40"
          >
            {callState.status === "calling"
              ? t.calling
              : callState.status === "ringing"
                ? t.ringing
                : pinRequired
                  ? t.pinCta
                  : t.callCta}
          </button>
        </form>
        {callState.status === "ringing" && callState.message && (
          <p className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-300">
            {callState.message}
          </p>
        )}
        {callState.status === "error" && callState.message && (
          <p className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-xs text-red-300">
            {callState.message}
          </p>
        )}
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
            {lead.need}
          </div>
        </div>
      }
      messages={history}
      loading={loading}
      error={error}
      resultCard={
        booking && (
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            <p className="font-semibold">{t.resultTitle}</p>
            <p className="mt-0.5">{booking.slot}</p>
            <p className="text-xs opacity-75">{booking.issue_summary}</p>
            <p className="mt-1.5 text-xs opacity-75">{t.resultFooter}</p>
          </div>
        )
      }
      inputDisabled={loading || !!booking}
      placeholder={booking ? t.placeholderBooked : t.placeholderDefault}
      typingLabel={`${persona} ${t.typingSuffix}`}
      voiceEnabled
      voiceLang={locale === "en" ? "en-US" : "pl-PL"}
      onSend={(text) => {
        const next: ChatMessage[] = [...history, { role: "user", content: text }];
        setHistory(next);
        void callAgent(next, lead, leadId);
      }}
      onRestart={reset}
    />
  );
}
