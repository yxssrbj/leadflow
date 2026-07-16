"use client";

// Inline script that executes during initial HTML parsing (hard loads) but is
// inert on client-side re-renders: scripts inserted by React never execute
// anyway, and React warns in dev when a component client-renders an
// executable <script> — which happens to the [locale] layout on every
// language switch. type="text/plain" on the client silences that;
// suppressHydrationWarning covers the deliberate type mismatch. Pattern from
// node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md.
export default function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
