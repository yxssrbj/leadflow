"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/[locale]/admin/businesses/actions";

// Cookie mutation inside a Server Action re-renders the current route (see
// Next's Server Actions docs), so on success the layout that renders this
// form simply swaps to the authenticated admin content — no client-side
// navigation needed here.
export default function AdminPinForm() {
  const [error, formAction, pending] = useActionState(loginAction, null);

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-32">
      <form action={formAction} className="glass w-full max-w-sm rounded-3xl p-8">
        <h1 className="font-display text-xl font-semibold text-hi">Admin</h1>
        <p className="mt-2 text-sm leading-6 text-mid">
          Internal tool — enter the admin PIN to manage business configs.
        </p>
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          required
          placeholder="PIN"
          className="field mt-5 w-full"
        />
        {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="mt-5 w-full rounded-full bg-ember px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:brightness-110 disabled:opacity-40"
        >
          {pending ? "Checking…" : "Enter"}
        </button>
      </form>
    </div>
  );
}
