import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "../globals.css";
import InlineScript from "@/components/InlineScript";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import MotionOrchestrator from "@/components/motion/MotionOrchestrator";
import { LOCALES, isLocale, type Locale } from "@/lib/i18n/locales";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { SITE_URL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face for headlines — rounded and approachable rather than
// technical; the audience is tradespeople and clinic owners, not devs.
const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"], // latin-ext covers Polish diacritics
  weight: ["400", "500", "600", "700", "800"],
});

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "pl";
  const dict = getDictionary(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      canonical: `/${locale}`,
      languages: { pl: "/pl", en: "/en" },
    },
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      url: `/${locale}`,
      siteName: "LeadFlow AI",
      locale: locale === "pl" ? "pl_PL" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: dict.meta.title,
      description: dict.meta.description,
    },
  };
}

// This is the app's root layout (defines <html>/<body>) even though it lives
// under the [locale] segment: API routes under src/app/api don't render React
// layouts at all, so there's no need for a separate layout.tsx directly in
// src/app — see docs/code-structure.md.
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const dict = getDictionary(locale);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${plusJakarta.variable} h-full antialiased`}
      // Server-rendered default; the head script swaps it to the stored theme
      // before first paint, and suppressHydrationWarning accepts the changed
      // value. Follows node_modules/next/dist/docs/01-app/02-guides/
      // preventing-flash-before-hydration.md verbatim — the attribute must
      // exist in the SSR output for the suppression to apply.
      data-theme="light"
      suppressHydrationWarning
    >
      <head>
        {/* Executes on hard loads only; on soft navigations (e.g. the locale
            switcher re-rendering this layout) it renders inert — the theme
            attribute already persists on <html>, and React would warn about a
            client-rendered executable script. See components/InlineScript. */}
        <InlineScript html='(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()' />
      </head>
      <body className="flex min-h-full flex-col bg-ink-950 text-hi">
        <MotionOrchestrator />
        <Nav locale={locale} dict={dict} />
        <main className="flex flex-1 flex-col">{children}</main>
        <Footer locale={locale} dict={dict} />
      </body>
    </html>
  );
}
