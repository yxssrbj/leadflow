import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locales";

export default function Footer({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const productLinks = [
    { href: `/${locale}/demo`, label: dict.footer.demo },
    { href: `/${locale}/dashboard`, label: dict.footer.dashboard },
    { href: `/${locale}#pricing`, label: dict.footer.pricing },
    { href: `/${locale}#contact`, label: dict.footer.contact },
  ];
  const agentLinks = [
    { href: `/${locale}/demo?tab=speed-to-lead`, label: dict.footer.speedToLead },
    { href: `/${locale}/demo?tab=quotation`, label: dict.footer.quotation },
    { href: `/${locale}/demo?tab=outbound`, label: dict.footer.outbound },
  ];

  return (
    <footer className="relative overflow-hidden border-t border-line bg-ink-950">
      <div className="mx-auto w-full max-w-6xl px-6 pt-16 pb-10">
        <div className="flex flex-col gap-12 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <p className="flex items-center gap-2.5 font-display text-lg font-bold text-hi">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ember text-xs font-black text-white">
                L
              </span>
              {dict.nav.brand}
            </p>
            <p className="mt-4 text-sm leading-7 text-mid">{dict.footer.tagline}</p>
          </div>
          <div className="flex gap-16 text-sm">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold tracking-[0.2em] text-low uppercase">
                {dict.footer.productHeading}
              </p>
              {productLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-mid transition-colors duration-300 hover:text-ember-400"
                >
                  {l.label}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold tracking-[0.2em] text-low uppercase">
                {dict.footer.agentsHeading}
              </p>
              {agentLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-mid transition-colors duration-300 hover:text-ember-400"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="hairline mt-14" />
        <p className="pt-6 text-center text-xs text-low">{dict.footer.copyright}</p>
      </div>
    </footer>
  );
}
