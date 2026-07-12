import { notFound, redirect } from "next/navigation";
import DashboardNav from "@/components/dashboard/DashboardNav";
import ResetDemoButton from "@/components/dashboard/ResetDemoButton";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { isLocale, type Locale } from "@/lib/i18n/locales";
import { getCurrentUser, getSessionBusinessId } from "@/lib/auth";
import { logoutAction } from "@/app/[locale]/login/actions";

// Gated by a real Supabase Auth session (see docs/tech-stack-roadmap.md
// "Auth") — replaces the old public `?business=<id>` query param entirely.
// A session resolves to exactly one business (business_configs.owner_user_id).
export default async function DashboardLayout({
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

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const session = await getSessionBusinessId();
  if (!session) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-32 text-center">
        <p className="text-sm leading-6 text-mid">{dict.dashboardAuth.notLinkedTitle}</p>
        <p className="text-sm leading-6 text-low">{dict.dashboardAuth.notLinkedBody}</p>
        <form action={logoutAction}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="mt-2 rounded-full border border-line px-4 py-1.5 text-xs font-medium text-mid transition-all duration-300 hover:border-ember-500/60 hover:text-hi"
          >
            {dict.dashboardAuth.logout}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 pt-28 pb-16 lg:flex-row lg:gap-12">
      <aside className="shrink-0 lg:w-56">
        <div className="mb-4 hidden items-center justify-between gap-2 lg:flex">
          <p className="flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] text-low uppercase">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {session.businessName}
          </p>
          <form action={logoutAction}>
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              className="text-[11px] font-semibold text-low underline-offset-4 hover:text-hi hover:underline"
            >
              {dict.dashboardAuth.logout}
            </button>
          </form>
        </div>
        <DashboardNav locale={locale} dict={dict} />
        <ResetDemoButton dict={dict} businessId={session.businessId} />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
