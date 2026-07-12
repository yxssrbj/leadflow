import Link from "next/link";
import { notFound } from "next/navigation";
import ContactSection from "@/components/ContactSection";
import HeroCanvas from "@/components/home/HeroCanvas";
import MagneticButton from "@/components/motion/MagneticButton";
import { getDictionary, type Dictionary } from "@/lib/i18n/getDictionary";
import { isLocale, type Locale } from "@/lib/i18n/locales";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const dict = getDictionary(locale);

  return (
    <div className="flex flex-col">
      <Hero locale={locale} dict={dict} />
      <StatsMarquee dict={dict} />
      <HowItWorks dict={dict} />
      <Agents locale={locale} dict={dict} />
      <Pricing locale={locale} dict={dict} />
      <ContactSection dict={dict} />
      <FinalCta locale={locale} dict={dict} />
    </div>
  );
}

/* ————————————————————— Hero ————————————————————— */

function Hero({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const h = dict.hero;
  return (
    <section className="relative flex min-h-svh items-center overflow-hidden">
      {/* Layered backdrop: particle field + ember bloom + vignette */}
      <HeroCanvas />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 72% 30%, rgba(255,106,31,0.13) 0%, transparent 65%), radial-gradient(50% 60% at 15% 85%, rgba(255,138,61,0.06) 0%, transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink-950"
      />

      <div className="relative mx-auto grid w-full max-w-6xl gap-16 px-6 pt-32 pb-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pt-24">
        <div className="flex flex-col items-start gap-7">
          <span className="rise-in inline-flex items-center gap-2 rounded-full border border-ember-600/30 bg-ember-600/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-ember-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ember-500" />
            </span>
            {h.badge}
          </span>

          <h1 className="rise-in rise-in-1 font-display text-[2.75rem] leading-[1.04] font-bold tracking-tight sm:text-6xl lg:text-[4.25rem]">
            {h.titleBefore}
            <span className="text-ember">{h.titleHighlight}</span>
            {h.titleAfter}
          </h1>

          <p className="rise-in rise-in-2 max-w-xl text-lg leading-8 text-mid">{h.subtitle}</p>

          <div className="rise-in rise-in-3 flex flex-wrap items-center gap-4">
            <MagneticButton>
              <Link
                href={`/${locale}/demo`}
                className="group inline-flex items-center gap-2 rounded-full bg-ember px-7 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:glow-ember hover:brightness-110"
              >
                {h.ctaDemo}
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
            </MagneticButton>
            <Link
              href={`/${locale}/dashboard`}
              className="rounded-full border border-line-strong px-7 py-3.5 text-sm font-semibold text-mid transition-all duration-300 hover:border-ember-500/60 hover:text-hi"
            >
              {h.ctaDashboard}
            </Link>
          </div>

          <p className="rise-in rise-in-4 text-xs text-low">{h.disclaimer}</p>
        </div>

        <HeroChatMock dict={dict} />
      </div>

      {/* Scroll hint */}
      <div
        aria-hidden
        className="rise-in rise-in-4 absolute bottom-7 left-1/2 hidden -translate-x-1/2 lg:block"
      >
        <span className="block h-10 w-px overflow-hidden bg-line-strong">
          <span className="block h-4 w-px animate-drift bg-ember-500" />
        </span>
      </div>
    </section>
  );
}

function HeroChatMock({ dict }: { dict: Dictionary }) {
  const c = dict.hero.chat;
  return (
    <div className="rise-in rise-in-3 relative mx-auto w-full max-w-sm">
      <div aria-hidden className="absolute -inset-8 rounded-[2.5rem] bg-ember-600/15 blur-3xl" />
      <div className="animate-drift">
        <div className="glass-strong relative overflow-hidden rounded-3xl shadow-2xl">
          <div className="flex items-center gap-3 border-b border-line px-5 py-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ember text-sm font-bold text-white">
              O
            </span>
            <div>
              <p className="text-sm font-semibold text-hi">{c.title}</p>
              <p className="flex items-center gap-1.5 text-xs text-low">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {c.subtitle}
              </p>
            </div>
          </div>
          <div className="space-y-3 p-5 text-sm">
            <Bubble side="right">{c.bubbleLead}</Bubble>
            <Bubble side="left">{c.bubbleAgent1}</Bubble>
            <Bubble side="right">{c.bubbleLead2}</Bubble>
            <Bubble side="left">{c.bubbleAgent2}</Bubble>
            <Bubble side="right">{c.bubbleLead3}</Bubble>
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-emerald-300">
              <p className="text-sm font-semibold">{c.confirmTitle}</p>
              <p className="mt-0.5 text-xs opacity-75">{c.confirmSubtitle}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({ side, children }: { side: "left" | "right"; children: React.ReactNode }) {
  return (
    <div className={`flex ${side === "right" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
          side === "right"
            ? "rounded-br-md bg-ember text-white"
            : "rounded-bl-md border border-line bg-white/[0.04] text-hi"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

/* ————————————————————— Stats marquee ————————————————————— */

function MarqueeStrip({ items, hidden = false }: { items: Dictionary["stats"]; hidden?: boolean }) {
  return (
    <div aria-hidden={hidden} className="flex shrink-0 items-center">
      {items.map((s) => (
        <div key={s.label} className="flex items-baseline gap-3 px-10">
          <span className="font-display text-3xl font-bold tracking-tight text-ember whitespace-nowrap">
            {s.value}
          </span>
          <span className="max-w-56 text-sm leading-tight text-mid">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function StatsMarquee({ dict }: { dict: Dictionary }) {
  return (
    <section className="relative border-y border-line bg-ink-900 py-8">
      <div className="marquee-mask overflow-hidden">
        <div className="animate-marquee flex w-max">
          <MarqueeStrip items={dict.stats} />
          <MarqueeStrip items={dict.stats} hidden />
        </div>
      </div>
    </section>
  );
}

/* ————————————————————— How it works ————————————————————— */

function HowItWorks({ dict }: { dict: Dictionary }) {
  return (
    <section className="relative bg-ink-950">
      <div className="mx-auto w-full max-w-6xl px-6 py-28">
        <SectionHeading eyebrow={dict.howItWorks.eyebrow} title={dict.howItWorks.title} />
        <div className="relative mt-16 grid gap-10 sm:grid-cols-3 sm:gap-6">
          {/* Connecting line */}
          <div aria-hidden className="hairline absolute top-6 right-[16%] left-[16%] hidden sm:block" />
          {dict.howItWorks.steps.map((s, i) => (
            <div key={s.title} data-reveal data-reveal-delay={String(i * 0.12)} className="relative">
              <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl border border-ember-600/40 bg-ink-900 font-display text-lg font-bold text-ember-400">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-6 font-display text-xl font-semibold text-hi">{s.title}</h3>
              <p className="mt-3 text-sm leading-7 text-mid">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ————————————————————— Agents ————————————————————— */

function Agents({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <section className="relative overflow-hidden bg-ink-900">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(45% 40% at 50% 0%, rgba(255,106,31,0.07) 0%, transparent 70%)",
        }}
      />
      <div className="relative mx-auto w-full max-w-6xl px-6 py-28">
        <SectionHeading eyebrow={dict.agentsSection.eyebrow} title={dict.agentsSection.title} />
        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {dict.agentsSection.agents.map((a, i) => (
            <div
              key={a.name}
              data-reveal
              data-reveal-delay={String(i * 0.12)}
              className="group glass relative flex flex-col rounded-3xl p-7 transition-all duration-500 hover:-translate-y-1.5 hover:border-ember-600/40"
            >
              {/* Hover bloom */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background: "radial-gradient(60% 40% at 50% 0%, rgba(255,106,31,0.08) 0%, transparent 70%)",
                }}
              />
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ember font-display text-lg font-bold text-white transition-shadow duration-500 group-hover:glow-ember">
                  {a.name[0]}
                </span>
                <div>
                  <p className="font-display text-lg font-semibold text-hi">{a.name}</p>
                  <p className="text-xs font-medium tracking-wide text-ember-400 uppercase">{a.role}</p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-7 text-mid">{a.desc}</p>
              <ul className="mt-5 flex flex-1 flex-col gap-2.5 text-sm text-hi/85">
                {a.points.map((p) => (
                  <li key={p} className="flex gap-2.5">
                    <span className="mt-0.5 text-ember-500">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
              <Link
                href={`/${locale}/demo?tab=${a.tab}`}
                className="mt-7 inline-flex w-fit items-center gap-2 text-sm font-semibold text-hi transition-colors duration-300 group-hover:text-ember-400"
              >
                {dict.agentsSection.cta} {a.name}
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ————————————————————— Pricing ————————————————————— */

function Pricing({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <section id="pricing" className="bg-ink-950">
      <div className="mx-auto w-full max-w-6xl px-6 py-28">
        <SectionHeading eyebrow={dict.pricing.eyebrow} title={dict.pricing.title} />
        <p data-reveal className="mx-auto mt-5 max-w-2xl text-center text-sm leading-7 text-mid">
          {dict.pricing.subtitle}
        </p>
        <div className="mt-16 grid items-stretch gap-6 lg:grid-cols-3">
          {dict.pricing.tiers.map((t, i) => {
            const highlight = i === 1;
            return (
              <div
                key={t.name}
                data-reveal
                data-reveal-delay={String(i * 0.12)}
                className={`relative flex flex-col rounded-3xl p-8 transition-transform duration-500 hover:-translate-y-1.5 ${
                  highlight
                    ? "border border-ember-600/50 bg-ink-850 glow-ember lg:scale-[1.03]"
                    : "glass"
                }`}
              >
                {highlight && (
                  <span className="absolute -top-3.5 left-8 rounded-full bg-ember px-3.5 py-1 text-xs font-bold text-white">
                    {dict.pricing.mostPopular}
                  </span>
                )}
                <h3 className="font-display text-lg font-semibold text-hi">{t.name}</h3>
                <p className="mt-4 font-display text-[2.6rem] leading-none font-bold tracking-tight text-hi">
                  {t.price}
                  <span className="ml-1 text-base font-medium text-low">{dict.pricing.perMonth}</span>
                </p>
                <p className="mt-2 text-xs text-low">{t.setup}</p>
                <p className="mt-4 text-sm leading-6 text-mid">{t.desc}</p>
                <div className="hairline my-6" />
                <ul className="flex flex-1 flex-col gap-3 text-sm text-hi/85">
                  {t.features.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <span className="mt-0.5 text-ember-500">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/${locale}/demo`}
                  className={`mt-8 rounded-full px-5 py-3 text-center text-sm font-semibold transition-all duration-300 ${
                    highlight
                      ? "bg-ember text-white hover:brightness-110"
                      : "border border-line-strong text-hi hover:border-ember-500/60 hover:text-ember-400"
                  }`}
                >
                  {dict.pricing.ctaLabel}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ————————————————————— Final CTA ————————————————————— */

function FinalCta({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <section className="relative overflow-hidden border-t border-line bg-ink-900">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(55% 65% at 50% 110%, rgba(255,106,31,0.16) 0%, transparent 70%)",
        }}
      />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-9 px-6 py-32 text-center">
        <h2
          data-reveal
          className="max-w-3xl font-display text-3xl leading-tight font-bold tracking-tight sm:text-5xl"
        >
          {dict.finalCta.title}
        </h2>
        <div data-reveal data-reveal-delay="0.15">
          <MagneticButton strength={0.35}>
            <Link
              href={`/${locale}/demo`}
              className="group inline-flex items-center gap-2.5 rounded-full bg-ember px-9 py-4 text-sm font-semibold text-white transition-all duration-300 hover:glow-ember hover:brightness-110"
            >
              {dict.finalCta.cta}
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}

/* ————————————————————— Shared ————————————————————— */

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div data-reveal className="text-center">
      <p className="inline-flex items-center gap-3 text-xs font-bold tracking-[0.25em] text-ember-500 uppercase">
        <span className="hairline w-8" />
        {eyebrow}
        <span className="hairline w-8" />
      </p>
      <h2 className="mx-auto mt-5 max-w-2xl font-display text-3xl font-bold tracking-tight text-hi sm:text-[2.6rem] sm:leading-[1.15]">
        {title}
      </h2>
    </div>
  );
}
