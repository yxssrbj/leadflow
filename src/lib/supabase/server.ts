import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Per-request Supabase client for Server Components, Server Actions, and
// Route Handlers — the standard @supabase/ssr App Router pattern. Session
// tokens actually get refreshed in src/proxy.ts on every request; the
// `setAll` here is best-effort so this same factory works from Server
// Components too (which can only *read* cookies, not write them — Next
// throws if you try). See lib/auth.ts for the functions built on top of this.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component — proxy.ts's session refresh
            // already keeps cookies fresh on the next request, so this is
            // safe to ignore here.
          }
        },
      },
    },
  );
}
