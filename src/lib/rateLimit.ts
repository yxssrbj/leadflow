import type { NextRequest } from "next/server";

// In-memory rate limiting for the demo's paid endpoints (Claude calls,
// Twilio calls). Deliberately simple: a fixed-window counter per key, held
// in module state. This is correct for the single-instance deploys this demo
// targets (one Node server / one container). If the app ever moves to
// serverless with many concurrent instances, swap the Map for a shared store
// (Upstash/Redis) behind the same two functions — see docs/audit-plan.md.

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

// Prevent unbounded growth if many distinct IPs hit the demo.
const MAX_KEYS = 5000;

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets — for a Retry-After header. */
  retryAfter: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  let w = windows.get(key);
  if (!w || now >= w.resetAt) {
    w = { count: 0, resetAt: now + windowMs };
    if (!windows.has(key) && windows.size >= MAX_KEYS) {
      // Drop the oldest-expiring entries rather than failing open forever.
      for (const [k, v] of windows) {
        if (now >= v.resetAt) windows.delete(k);
        if (windows.size < MAX_KEYS) break;
      }
    }
    windows.set(key, w);
  }
  w.count += 1;
  return {
    ok: w.count <= limit,
    retryAfter: Math.max(1, Math.ceil((w.resetAt - now) / 1000)),
  };
}

/** Best-effort client identity — good enough to stop casual abuse. */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "local";
}

// Budgets. Overridable via env so a pitch day with heavy use doesn't need a
// code change; defaults are generous for one human clicking around.
function envInt(name: string, fallback: number): number {
  const v = parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Chat turns: per-IP burst limit plus a per-IP daily ceiling. */
export function limitAgentRequest(req: NextRequest): RateLimitResult {
  const ip = clientIp(req);
  const burst = rateLimit(`agent:min:${ip}`, envInt("AGENT_RATE_PER_MINUTE", 20), 60_000);
  if (!burst.ok) return burst;
  return rateLimit(`agent:day:${ip}`, envInt("AGENT_RATE_PER_DAY", 300), DAY_MS);
}

/** Real phone calls: per-IP and a hard global daily cap across all visitors. */
export function limitVoiceRequest(req: NextRequest): RateLimitResult {
  const ip = clientIp(req);
  const perIp = rateLimit(`voice:ip:${ip}`, envInt("VOICE_RATE_PER_HOUR", 3), 60 * 60_000);
  if (!perIp.ok) return perIp;
  return rateLimit("voice:global:day", envInt("VOICE_RATE_GLOBAL_PER_DAY", 10), DAY_MS);
}

export const RATE_LIMIT_MESSAGE = {
  pl: "Zbyt wiele żądań — spróbuj ponownie za chwilę.",
  en: "Too many requests — please try again in a moment.",
} as const;
