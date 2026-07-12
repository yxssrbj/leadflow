import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { DEFAULT_LOCALE, LOCALES, isLocale } from "@/lib/i18n/locales";

// Redirects unprefixed paths ("/", "/demo", ...) to a locale-prefixed one
// ("/pl", "/pl/demo", ...), picking the locale from the browser's
// Accept-Language header and defaulting to Polish (this is a Poland-first
// business — see plan.md). API routes, static files, and already-prefixed
// paths pass through untouched. Once a request is locale-prefixed, this also
// refreshes the Supabase Auth session (see docs/tech-stack-roadmap.md
// "Auth") — required so a short-lived access token doesn't silently expire
// mid-session; Server Components can only *read* cookies, so the actual
// refresh has to happen here, not in lib/auth.ts.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = LOCALES.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));
  if (!hasLocale) {
    const locale = detectLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  return refreshSession(request);
}

async function refreshSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Must be awaited: this is what actually triggers the token refresh (and
  // thus the setAll callback above) before the response is returned. The
  // per-page auth check (redirect if unauthenticated) still happens in
  // dashboard/layout.tsx via getCurrentUser() — this only keeps the session
  // cookie itself from going stale.
  await supabase.auth.getUser();

  return response;
}

function detectLocale(request: NextRequest): string {
  const header = request.headers.get("accept-language");
  const preferred = header?.split(",")[0]?.split("-")[0]?.toLowerCase();
  if (preferred && isLocale(preferred)) return preferred;
  return DEFAULT_LOCALE;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
