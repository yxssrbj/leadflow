"use client";

import { useActionState, useState } from "react";
import { loginAction, registerAction } from "@/app/[locale]/login/actions";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locales";

export default function LoginForm({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const t = dict.login;
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginState, loginFormAction, loginPending] = useActionState(loginAction, null);
  const [registerState, registerFormAction, registerPending] = useActionState(registerAction, null);

  const isLogin = mode === "login";
  const state = isLogin ? loginState : registerState;
  const pending = isLogin ? loginPending : registerPending;

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-32">
      <form
        action={isLogin ? loginFormAction : registerFormAction}
        className="glass w-full max-w-sm rounded-3xl p-8"
      >
        <h1 className="font-display text-xl font-semibold text-hi">{t.heading}</h1>
        <p className="mt-2 text-sm leading-6 text-mid">
          {isLogin ? t.subtitleLogin : t.subtitleRegister}
        </p>
        <input type="hidden" name="locale" value={locale} />
        {!isLogin && (
          <>
            <input
              name="fullName"
              type="text"
              autoComplete="name"
              autoFocus
              required
              placeholder={t.fullNamePlaceholder}
              className="field mt-5 w-full"
            />
            <input
              name="businessName"
              type="text"
              autoComplete="organization"
              required
              placeholder={t.businessNamePlaceholder}
              className="field mt-3 w-full"
            />
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              placeholder={t.phonePlaceholder}
              className="field mt-3 w-full"
            />
          </>
        )}
        <input
          name="email"
          type="email"
          autoComplete="email"
          autoFocus={isLogin}
          required
          placeholder={t.emailPlaceholder}
          className={`field w-full ${isLogin ? "mt-5" : "mt-3"}`}
        />
        <input
          name="password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
          placeholder={t.passwordPlaceholder}
          className="field mt-3 w-full"
        />
        {state?.error && <p className="mt-3 text-xs text-red-300">{state.error}</p>}
        {state?.info && <p className="mt-3 text-xs text-emerald-300">{state.info}</p>}
        <button
          type="submit"
          disabled={pending}
          className="mt-5 w-full rounded-full bg-ember px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:brightness-110 disabled:opacity-40"
        >
          {isLogin ? (pending ? t.signingIn : t.signIn) : pending ? t.registering : t.register}
        </button>
        <button
          type="button"
          onClick={() => setMode(isLogin ? "register" : "login")}
          className="mt-4 w-full text-center text-xs text-mid transition-colors duration-300 hover:text-hi"
        >
          {isLogin ? t.toRegister : t.toLogin}
        </button>
      </form>
    </div>
  );
}
