import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { isLocale, type Locale } from "@/lib/i18n/locales";
import LoginForm from "@/components/auth/LoginForm";

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  // Already signed in — no reason to show the form again.
  if (await getCurrentUser()) redirect(`/${locale}/dashboard`);

  return <LoginForm locale={locale} dict={getDictionary(locale)} />;
}
