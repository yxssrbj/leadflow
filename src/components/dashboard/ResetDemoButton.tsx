"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/lib/i18n/getDictionary";

// "Put the demo back to its clean starting state" — lives in the dashboard
// sidebar so it's one click away between pitches. Confirms first; keeps
// analytics events (see lib/db.ts). Resets the signed-in business — one
// account, one business, no more picking a target via a query param.
export default function ResetDemoButton({ dict, businessId }: { dict: Dictionary; businessId: string }) {
  const t = dict.dashboardReset;
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [failed, setFailed] = useState(false);

  async function reset() {
    if (!window.confirm(t.confirm)) return;
    setWorking(true);
    setFailed(false);
    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      if (!res.ok) throw new Error("reset failed");
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="mt-6">
      <button
        onClick={() => void reset()}
        disabled={working}
        className="w-full rounded-xl border border-line px-4 py-2.5 text-left text-sm font-medium text-mid transition-all duration-300 hover:border-ember-500/60 hover:text-hi disabled:opacity-40 lg:w-auto"
      >
        {working ? t.working : t.cta}
      </button>
      {failed && <p className="mt-2 text-xs text-red-300">{t.error}</p>}
    </div>
  );
}
