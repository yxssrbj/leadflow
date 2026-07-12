import { cookies } from "next/headers";

// Interim gate for /admin — the same "PIN env var, no PIN configured means
// the feature is fully off" pattern already used for VOICE_DEMO_PIN
// (src/app/api/voice/start/route.ts). Real per-client auth (Clerk) is a
// separate, later Tier 1 item in docs/tech-stack-roadmap.md; this exists so
// the admin screen isn't a wide-open write endpoint on a public demo URL
// until that lands.
const COOKIE_NAME = "lf_admin";

export function adminPinConfigured(): boolean {
  return Boolean(process.env.ADMIN_PIN);
}

export function checkAdminPin(pin: string): boolean {
  const configured = process.env.ADMIN_PIN;
  return Boolean(configured) && pin === configured;
}

// Read-only check — safe to call from a Server Component (layout) to decide
// what to render. Server Actions that mutate data must call
// requireAdmin() instead (see admin/businesses/actions.ts): rendering a
// form only behind an authed page is not itself a security boundary, since
// an action's POST endpoint is reachable directly. See Next's Server
// Actions security guidance.
export async function isAdminAuthed(): Promise<boolean> {
  if (!adminPinConfigured()) return false;
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value === process.env.ADMIN_PIN;
}

// Throws if the caller isn't authed — call this at the top of every
// admin Server Action before touching the database.
export async function requireAdmin(): Promise<void> {
  if (!(await isAdminAuthed())) {
    throw new Error("Not authorized.");
  }
}

export async function setAdminCookie(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, process.env.ADMIN_PIN ?? "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12h — re-enter the PIN once a day of use
  });
}

export async function clearAdminCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
