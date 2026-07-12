"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

// Unlike the admin PIN form's loginAction (which re-renders the same gated
// page in place via a cookie mutation), this needs a real navigation on
// success — the login page and the dashboard are different routes.
export async function loginAction(_prevState: string | null, formData: FormData): Promise<string | null> {
  const locale = str(formData, "locale") || "pl";
  const email = str(formData, "email");
  const password = str(formData, "password");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return "Incorrect email or password.";

  redirect(`/${locale}/dashboard`);
}

export async function logoutAction(formData: FormData): Promise<void> {
  const locale = str(formData, "locale") || "pl";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}/login`);
}
