import type { LeadStatus } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/getDictionary";

// Translucent tinted chips tuned for the dark obsidian surfaces.
const STYLES: Record<LeadStatus, string> = {
  new: "border-sky-400/25 bg-sky-400/10 text-sky-300",
  qualified: "border-indigo-400/25 bg-indigo-400/10 text-indigo-300",
  booked: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  quoted: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  dead: "border-white/10 bg-white/5 text-low",
  revived: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  closed: "border-white/10 bg-white/5 text-low line-through",
};

export default function StatusBadge({ status, dict }: { status: LeadStatus; dict: Dictionary }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STYLES[status]}`}
    >
      {dict.statusLabels[status] ?? status}
    </span>
  );
}
