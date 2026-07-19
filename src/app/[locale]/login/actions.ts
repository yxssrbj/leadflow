"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export interface AuthFormState {
  error?: string;
  info?: string;
}

// Unlike the admin PIN form's loginAction (which re-renders the same gated
// page in place via a cookie mutation), this needs a real navigation on
// success — the login page and the dashboard are different routes.
export async function loginAction(
  _prevState: AuthFormState | null,
  formData: FormData,
): Promise<AuthFormState | null> {
  const locale = str(formData, "locale") || "pl";
  const email = str(formData, "email");
  const password = str(formData, "password");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      error: locale === "pl" ? "Nieprawidłowy e-mail lub hasło." : "Incorrect email or password.",
    };
  }

  redirect(`/${locale}/dashboard`);
}

export async function registerAction(
  _prevState: AuthFormState | null,
  formData: FormData,
): Promise<AuthFormState | null> {
  const locale = str(formData, "locale") || "pl";
  const email = str(formData, "email");
  const password = str(formData, "password");
  const fullName = str(formData, "fullName");
  const businessName = str(formData, "businessName");
  const phone = str(formData, "phone");

  if (!fullName || !businessName || !phone) {
    return {
      error:
        locale === "pl"
          ? "Podaj imię i nazwisko, nazwę firmy oraz telefon."
          : "Please provide your full name, business name, and phone number.",
    };
  }

  const supabase = await createClient();
  // Stored as Supabase Auth user_metadata, not a business_configs row — a
  // registered account isn't a provisioned client. This is how the agency
  // sees who signed up (name, business, phone) to manually link the account
  // to a BusinessConfig (business_configs.owner_user_id) during onboarding.
  // Until then DashboardLayout shows the "not linked yet" state.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, business_name: businessName, phone } },
  });
  if (error) {
    return {
      error:
        locale === "pl"
          ? `Nie udało się założyć konta: ${error.message}`
          : `Couldn't create the account: ${error.message}`,
    };
  }

  // With email confirmation enabled Supabase creates the user but no session —
  // the account only works after the confirmation link is clicked.
  if (!data.session) {
    return {
      info:
        locale === "pl"
          ? "Konto utworzone. Sprawdź skrzynkę i potwierdź adres e-mail, aby się zalogować."
          : "Account created. Check your inbox and confirm your email to sign in.",
    };
  }

  redirect(`/${locale}/dashboard`);
}

export async function logoutAction(formData: FormData): Promise<void> {
  const locale = str(formData, "locale") || "pl";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}/login`);
}
