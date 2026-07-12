"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/[locale]/login/actions";
import type { Locale } from "@/lib/i18n/locales";

export default function LoginForm({ locale }: { locale: Locale }) {
  const [error, formAction, pending] = useActionState(loginAction, null);

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-32">
      <form action={formAction} className="glass w-full max-w-sm rounded-3xl p-8">
        <h1 className="font-display text-xl font-semibold text-hi">Panel klienta</h1>
        <p className="mt-2 text-sm leading-6 text-mid">Zaloguj się, aby zobaczyć swój panel.</p>
        <input type="hidden" name="locale" value={locale} />
        <input
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          placeholder="Adres e-mail"
          className="field mt-5 w-full"
        />
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Hasło"
          className="field mt-3 w-full"
        />
        {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="mt-5 w-full rounded-full bg-ember px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:brightness-110 disabled:opacity-40"
        >
          {pending ? "Logowanie…" : "Zaloguj się"}
        </button>
      </form>
    </div>
  );
}
