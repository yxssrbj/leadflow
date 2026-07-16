"use client";

import { useSyncExternalStore } from "react";

// Sun/moon switch for the two themes. Light is the default; dark is opted
// into via [data-theme="dark"] on <html>, set before first paint by the
// inline script in layout.tsx and persisted in localStorage under "theme".
//
// The current theme is read straight from the <html> attribute through
// useSyncExternalStore rather than component state: the attribute is the
// single source of truth (the inline script owns it before hydration), and
// the store read is synchronous at mount — no stale-until-first-frame state.

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function getSnapshot(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

// SSR always renders the light default; useSyncExternalStore reconciles to
// the real value immediately after hydration for dark-mode visitors.
function getServerSnapshot(): "light" | "dark" {
  return "light";
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    // Always an explicit value, never a removed attribute — SSR renders
    // data-theme="light", and hydration suppression relies on the attribute
    // existing on both sides (see layout.tsx).
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* storage blocked (private mode) — the toggle still works for this visit */
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="ml-2 flex h-9 w-9 items-center justify-center rounded-full border border-line text-mid transition-all duration-300 hover:border-ember-500/60 hover:text-hi"
    >
      {theme === "dark" ? (
        /* sun */
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path strokeLinecap="round" d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" />
        </svg>
      ) : (
        /* moon */
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a7 7 0 1 0 10.7 10.7Z" />
        </svg>
      )}
    </button>
  );
}
