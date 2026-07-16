"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locales";

export default function Nav({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const rest = pathname.replace(new RegExp(`^/${locale}`), "") || "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on navigation (state-adjust-during-render pattern)
  // and lock body scroll while it's open.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const LINKS = [
    { href: `/${locale}`, label: dict.nav.home },
    { href: `/${locale}/demo`, label: dict.nav.demo },
    { href: `/${locale}/dashboard`, label: dict.nav.dashboard },
    { href: `/${locale}#contact`, label: dict.nav.contact },
  ];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled || open ? "glass-strong shadow-[var(--nav-shadow)]" : "bg-transparent"
      }`}
      style={{ borderBottom: scrolled || open ? "1px solid var(--line)" : "1px solid transparent" }}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link
          href={`/${locale}`}
          className="group flex items-center gap-2.5 text-lg font-bold tracking-tight text-hi"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ember text-sm font-black text-white transition-shadow duration-300 group-hover:glow-ember">
            L
          </span>
          <span className="font-display">{dict.nav.brand}</span>
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-1">
          {LINKS.map((l) => {
            const base = l.href.split("#")[0];
            const active =
              base === `/${locale}`
                ? pathname === `/${locale}` && !l.href.includes("#")
                : pathname.startsWith(base);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative hidden rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-300 sm:block ${
                  active ? "text-hi" : "text-mid hover:text-hi"
                }`}
              >
                {l.label}
                <span
                  className={`absolute inset-x-3.5 -bottom-px h-px bg-ember-500 transition-transform duration-300 ${
                    active ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </Link>
            );
          })}

          {/* Locale pill — swaps the path prefix, keeps the rest of the URL */}
          <span className="ml-2 flex items-center rounded-full border border-line p-0.5 text-[11px] font-bold tracking-wide">
            {(["pl", "en"] as const).map((l) => (
              <Link
                key={l}
                href={`/${l}${rest}`}
                aria-current={locale === l ? "true" : undefined}
                className={`rounded-full px-2.5 py-1 uppercase transition-all duration-300 ${
                  locale === l ? "bg-ember text-white" : "text-low hover:text-hi"
                }`}
              >
                {l}
              </Link>
            ))}
          </span>

          <ThemeToggle />

          <Link
            href={`/${locale}/demo`}
            className="ml-3 hidden rounded-full bg-ember px-4.5 py-2 text-sm font-semibold text-white transition-all duration-300 hover:glow-ember hover:brightness-110 md:block"
          >
            {dict.nav.tryLive}
          </Link>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={dict.nav.demo}
            className="ml-2 flex h-9 w-9 flex-col items-center justify-center gap-[5px] rounded-full border border-line sm:hidden"
          >
            <span
              className={`h-px w-4 bg-hi transition-transform duration-300 ${open ? "translate-y-[3px] rotate-45" : ""}`}
            />
            <span
              className={`h-px w-4 bg-hi transition-transform duration-300 ${open ? "-translate-y-[3px] -rotate-45" : ""}`}
            />
          </button>
        </nav>
      </div>

      {/* Mobile overlay menu */}
      <div
        className={`sm:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          className={`fixed inset-x-0 top-16 bottom-0 z-40 transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          } glass-strong`}
        >
          <nav className="flex flex-col gap-1 px-6 py-8">
            {LINKS.map((l, i) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                style={{ transitionDelay: open ? `${80 + i * 60}ms` : "0ms" }}
                className={`rounded-xl px-4 py-3.5 font-display text-2xl font-semibold text-hi transition-all duration-500 hover:bg-ink-800 ${
                  open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href={`/${locale}/demo`}
              onClick={() => setOpen(false)}
              style={{ transitionDelay: open ? "360ms" : "0ms" }}
              className={`mt-4 rounded-full bg-ember px-6 py-3.5 text-center font-semibold text-white transition-all duration-500 ${
                open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              {dict.nav.tryLive}
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
