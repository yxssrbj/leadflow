"use client";

import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { useVoiceChat } from "@/lib/useVoice";
import type { Dictionary } from "@/lib/i18n/getDictionary";

interface ChatUIProps {
  title: string;
  subtitle: string;
  intro?: ReactNode;
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  resultCard?: ReactNode;
  inputDisabled: boolean;
  placeholder: string;
  typingLabel: string;
  onSend: (text: string) => void;
  onRestart: () => void;
  dict: Dictionary;
  /** Speak assistant replies aloud and offer a mic button for spoken input. Typing still works. */
  voiceEnabled?: boolean;
  voiceLang?: string;
}

export default function ChatUI({
  title,
  subtitle,
  intro,
  messages,
  loading,
  error,
  resultCard,
  inputDisabled,
  placeholder,
  typingLabel,
  onSend,
  onRestart,
  dict,
  voiceEnabled = false,
  voiceLang = "pl-PL",
}: ChatUIProps) {
  const [input, setInput] = useState("");
  const [muted, setMuted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const spokenCountRef = useRef(0);
  const voice = useVoiceChat(voiceLang);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, resultCard]);

  // Speak each new assistant reply aloud as it arrives, once.
  useEffect(() => {
    if (!voiceEnabled || muted) return;
    for (let i = spokenCountRef.current; i < messages.length; i++) {
      const m = messages[i];
      if (m.role === "assistant") voice.speak(m.content);
    }
    spokenCountRef.current = messages.length;
  }, [voiceEnabled, muted, messages, voice]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!input.trim() || inputDisabled) return;
    onSend(input.trim());
    setInput("");
  }

  function handleMicClick() {
    if (voice.listening) {
      voice.stopListening();
      return;
    }
    voice.cancelSpeaking();
    voice.listen((text) => onSend(text));
  }

  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-6 rounded-[2rem] bg-ember-600/8 blur-2xl" />
      <div className="glass-strong relative flex h-[34rem] w-full flex-col overflow-hidden rounded-3xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ember text-sm font-bold text-white">
              {title[0]}
            </span>
            <div>
              <p className="text-sm font-semibold text-hi">{title}</p>
              <p className="flex items-center gap-1.5 text-xs text-low">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {voiceEnabled && voice.synthesisSupported && (
              <button
                onClick={() => {
                  setMuted((m) => !m);
                  voice.cancelSpeaking();
                }}
                title={muted ? dict.chatUI.muteOn : dict.chatUI.muteOff}
                className="text-sm text-low transition-colors duration-300 hover:text-hi"
              >
                {muted ? "🔇" : voice.speaking ? "🔊" : "🔈"}
              </button>
            )}
            <button
              onClick={onRestart}
              className="rounded-full border border-line px-3 py-1 text-xs font-medium text-mid transition-all duration-300 hover:border-ember-500/60 hover:text-hi"
            >
              {dict.chatUI.restart}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {intro}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "rounded-br-md bg-ember text-white"
                    : "rounded-bl-md border border-line bg-white/[0.04] text-hi"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2.5 rounded-2xl rounded-bl-md border border-line bg-white/[0.04] px-4 py-3">
                <span className="flex gap-1">
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ember-400" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ember-400" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ember-400" />
                </span>
                <span className="text-xs text-low">{typingLabel}</span>
              </div>
            </div>
          )}
          {error && (
            <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-xs leading-relaxed text-red-300">
              {error}
            </p>
          )}
          {resultCard}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-1.5 border-t border-line p-4">
          <div className="flex gap-2">
            {voiceEnabled && voice.recognitionSupported && (
              <button
                type="button"
                onClick={handleMicClick}
                disabled={inputDisabled}
                title={voice.listening ? dict.chatUI.stopListening : dict.chatUI.speakAsLead}
                className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold text-white transition-all duration-300 disabled:opacity-40 ${
                  voice.listening ? "animate-pulse bg-red-600" : "bg-ember hover:brightness-110"
                }`}
              >
                {voice.listening ? dict.chatUI.listening : "🎤"}
              </button>
            )}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={inputDisabled}
              placeholder={placeholder}
              className="field flex-1 rounded-full px-5 py-3 text-base disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={inputDisabled}
              className="rounded-full bg-hi px-5 py-2.5 text-sm font-semibold text-ink-950 transition-all duration-300 hover:bg-white disabled:opacity-40"
            >
              {dict.chatUI.send}
            </button>
          </div>
          {voiceEnabled && !voice.recognitionSupported && (
            <p className="px-1 text-[11px] text-low">{dict.chatUI.speechHint}</p>
          )}
        </form>
      </div>
    </div>
  );
}
