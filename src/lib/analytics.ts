"use client";

import type { AnalyticsEventName } from "./types";

// Client-side helper for the first-party demo analytics (/api/track).
// Fire-and-forget by design: failures are swallowed and nothing here may
// ever block or break the demo experience it measures.

const SESSION_KEY = "lf-session";

function sessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

export function track(name: AnalyticsEventName, meta?: Record<string, string>): void {
  try {
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session: sessionId(), name, meta }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // never let analytics take the demo down
  }
}
