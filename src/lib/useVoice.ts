"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal shape of the Web Speech API — TypeScript's DOM lib doesn't ship types
// for it yet, so we declare just what we use.
interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
  isFinal: boolean;
}
interface SpeechRecognitionEventLike extends Event {
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// Browser-native speech in/out — no API keys, no server round-trip, works
// entirely client-side. Speech recognition (listening) only works in
// Chromium-based browsers (Chrome, Edge); speech synthesis (speaking) is
// broadly supported. Callers should check `recognitionSupported` /
// `synthesisSupported` before showing the corresponding UI.
export function useVoiceChat(lang = "pl-PL") {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const recognitionSupported =
    typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const synthesisSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const listen = useCallback(
    (onResult: (text: string) => void) => {
      if (!recognitionSupported) return;
      const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition!;
      const recognition = new Ctor();
      recognition.lang = lang;
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.onresult = (event) => {
        const last = event.results[event.results.length - 1];
        const text = last?.[0]?.transcript?.trim();
        if (text) onResult(text);
      };
      recognition.onerror = () => setListening(false);
      recognition.onend = () => setListening(false);
      recognitionRef.current = recognition;
      setListening(true);
      recognition.start();
    },
    [lang, recognitionSupported],
  );

  const speak = useCallback(
    (text: string) => {
      if (!synthesisSupported) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      const plVoice = window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith("pl"));
      if (plVoice) utterance.voice = plVoice;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [lang, synthesisSupported],
  );

  const cancelSpeaking = useCallback(() => {
    if (synthesisSupported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [synthesisSupported]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (synthesisSupported) window.speechSynthesis.cancel();
    };
  }, [synthesisSupported]);

  return {
    listen,
    stopListening,
    listening,
    speak,
    cancelSpeaking,
    speaking,
    recognitionSupported,
    synthesisSupported,
  };
}

const KOKORO_URL = process.env.NEXT_PUBLIC_KOKORO_URL || "http://localhost:8880";

// Kokoro TTS via a local Docker container (ghcr.io/remsky/kokoro-fastapi-cpu) —
// free, local, OpenAI-compatible /v1/audio/speech endpoint. ENGLISH ONLY:
// Kokoro's supported language codes are en/es/fr/hi/it/ja/pt-br/zh — no Polish.
// Verified it silently mispronounces Polish text by running it through
// Portuguese phoneme rules instead of erroring. Used only by
// components/demos/KokoroVoiceTest.tsx, an internal English-only test
// widget — never call this with Polish text. Ola's real voice stays on the
// browser TTS backend in ChatUI, which speaks correct Polish.
export async function speakViaKokoro(
  text: string,
  opts: { voice?: string; onStart?: () => void; onEnd?: () => void; onAudioReady?: (audio: HTMLAudioElement) => void } = {},
): Promise<void> {
  const res = await fetch(`${KOKORO_URL}/v1/audio/speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "kokoro",
      voice: opts.voice ?? "af_heart",
      input: text,
      response_format: "mp3",
      lang_code: "a",
    }),
  });
  if (!res.ok) {
    throw new Error(`Kokoro TTS request failed: ${res.status} ${await res.text()}`);
  }
  const blob = await res.blob();
  const audio = new Audio(URL.createObjectURL(blob));
  opts.onAudioReady?.(audio);
  opts.onStart?.();
  audio.onended = () => opts.onEnd?.();
  await audio.play();
}
