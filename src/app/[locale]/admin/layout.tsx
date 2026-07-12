import { notFound } from "next/navigation";
import Link from "next/link";
import { adminPinConfigured, isAdminAuthed } from "@/lib/adminAuth";
import { isLocale, type Locale } from "@/lib/i18n/locales";
import AdminPinForm from "@/components/admin/AdminPinForm";
import { logoutAction } from "./businesses/actions";

// Interim internal-only screen for editing BusinessConfig records (see
// docs/tech-stack-roadmap.md "Multi-tenant config"). Gated by ADMIN_PIN —
// unset entirely disables the feature, mirroring how VOICE_DEMO_PIN gates
// real phone calls (src/app/api/voice/start/route.ts). Real per-client auth
// (Clerk) is a separate, later roadmap item; this is not it.
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  if (!adminPinConfigured()) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-32 text-center">
        <p className="max-w-md text-sm leading-6 text-mid">
          Admin is disabled. Set <code className="text-ember-400">ADMIN_PIN</code> in{" "}
          <code className="text-ember-400">web/.env.local</code> to enable it.
        </p>
      </div>
    );
  }

  if (!(await isAdminAuthed())) {
    return <AdminPinForm />;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 pt-28 pb-16">
      <div className="flex items-center justify-between">
        <Link href={`/${locale}/admin/businesses`} className="font-display text-lg font-semibold text-hi">
          Admin · Businesses
        </Link>
        <form action={logoutAction}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="rounded-full border border-line px-4 py-1.5 text-xs font-medium text-mid transition-all duration-300 hover:border-ember-500/60 hover:text-hi"
          >
            Log out
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}
