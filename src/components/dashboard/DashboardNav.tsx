"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locales";

export default function DashboardNav({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const pathname = usePathname();
  const base = `/${locale}/dashboard`;

  const LINKS = [
    { href: base, label: dict.dashboardNav.overview },
    { href: `${base}/leads`, label: dict.dashboardNav.leads },
    { href: `${base}/appointments`, label: dict.dashboardNav.appointments },
    { href: `${base}/quotes`, label: dict.dashboardNav.quotes },
    { href: `${base}/analytics`, label: dict.dashboardNav.analytics },
  ];

  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-1.5">
      {LINKS.map((l) => {
        const active = l.href === base ? pathname === base : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`relative rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-300 ${
              active
                ? "border border-ember-600/30 bg-ember-600/10 text-ember-400"
                : "border border-transparent text-mid hover:bg-white/[0.04] hover:text-hi"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
