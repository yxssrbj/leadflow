"use client";

import { useState } from "react";
import { speakViaKokoro } from "@/lib/useVoice";
import type { Dictionary } from "@/lib/i18n/getDictionary";

const DEFAULT_TEXT =
  "Hi, this is Ola from SolarTech Krakow. I can offer you a free solar audit this week — would tomorrow morning or afternoon work better?";

const VOICES = [
  { id: "af_heart", label: "Heart (US female)" },
  { id: "af_bella", label: "Bella (US female)" },
  { id: "am_adam", label: "Adam (US male)" },
  { id: "bf_emma", label: "Emma (UK female)" },
  { id: "bm_george", label: "George (UK male)" },
];

// Internal testing widget only — not part of the customer-facing demo.
// Kokoro has no Polish language support (verified: it mispronounces Polish by
// running it through Portuguese/English phoneme rules), so this only ever
// sends it English text. Ola's actual Polish voice stays on the browser TTS
// wired up in ChatUI/SpeedToLeadDemo.
export default function KokoroVoiceTest({ dict }: { dict: Dictionary }) {
  const t = dict.kokoro;
  const [text, setText] = useState(DEFAULT_TEXT);
  const [voice, setVoice] = useState("af_heart");
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSpeak() {
    if (!text.trim() || speaking) return;
    setError(null);
    setSpeaking(true);
    try {
      await speakViaKokoro(text.trim(), { voice });
    } catch {
      setError(t.error);
    } finally {
      setSpeaking(false);
    }
  }

  return (
    <div className="rounded-3xl border border-dashed border-line-strong bg-white/[0.015] p-6">
      <p className="text-[11px] font-bold tracking-[0.2em] text-low uppercase">{t.internalLabel}</p>
      <h3 className="mt-2 font-display font-semibold text-hi">{t.title}</h3>
      <p className="mt-1.5 text-sm leading-6 text-mid">{t.description}</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="text-xs font-medium text-mid">{t.textLabel}</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            className="field mt-1.5 w-full resize-none"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-mid">{t.voiceLabel}</label>
          <select value={voice} onChange={(e) => setVoice(e.target.value)} className="field mt-1.5 w-full">
            {VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleSpeak}
          disabled={speaking}
          className="shrink-0 rounded-full bg-hi px-5 py-2.5 text-sm font-semibold text-ink-950 transition-all duration-300 hover:bg-white disabled:opacity-40"
        >
          {speaking ? t.playing : t.playCta}
        </button>
      </div>
      {error && (
        <p className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
