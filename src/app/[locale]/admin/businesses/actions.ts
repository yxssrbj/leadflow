"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin, checkAdminPin, setAdminCookie, clearAdminCookie } from "@/lib/adminAuth";
import {
  deleteBusinessConfig,
  getBusinessConfig,
  isBusinessId,
  upsertBusinessConfig,
} from "@/lib/agents/configs";
import type { BusinessConfig } from "@/lib/agents/types";

// Every action here is a real POST endpoint reachable directly, independent
// of whether the admin UI happens to be rendered — so each one re-checks
// the PIN itself via requireAdmin() rather than trusting the page that
// invoked it. See the security note in src/lib/adminAuth.ts.

export async function loginAction(_prevState: string | null, formData: FormData): Promise<string | null> {
  const pin = String(formData.get("pin") ?? "");
  if (!checkAdminPin(pin)) return "Incorrect PIN.";
  await setAdminCookie();
  // useActionState re-renders in place rather than navigating, so the PIN
  // form's own page (already gated by the layout) picks up the new cookie
  // and swaps to the admin content on the next render — no redirect needed.
  return null;
}

// Splits a "one question per line" textarea into a clean string[], the
// admin-form equivalent of BusinessConfig.qualifyingQuestions.
function linesToList(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function saveBusinessConfig(formData: FormData): Promise<void> {
  await requireAdmin();

  // redirect() needs an absolute path; the locale comes along as a hidden
  // form field since Server Actions don't have access to route params.
  const locale = str(formData, "locale") || "pl";
  const id = str(formData, "id");
  if (!/^[a-z0-9-]+$/.test(id)) {
    throw new Error("Business id must be lowercase letters, numbers, and hyphens only.");
  }

  // model overrides aren't exposed in this form (rarely-used, advanced
  // field) — preserve whatever the existing record has on edit, omit on create.
  const isNew = String(formData.get("isNew")) === "true";
  const existing = isNew ? null : await getBusinessConfig(id);
  if (!isNew && (!existing || existing.id !== id)) {
    throw new Error("Cannot change the id of an existing business.");
  }

  const config: BusinessConfig = {
    id,
    businessName: str(formData, "businessName"),
    city: str(formData, "city"),
    vertical: str(formData, "vertical"),
    services: str(formData, "services"),
    appointmentLabel: str(formData, "appointmentLabel"),
    subsidyNote: str(formData, "subsidyNote"),
    qualifyingQuestions: linesToList(formData.get("qualifyingQuestions")),
    pricingGuide: {
      pl: str(formData, "pricingGuidePl"),
      en: str(formData, "pricingGuideEn"),
    },
    agents: {
      speedToLead: { name: str(formData, "agent_speedToLead_name"), role: str(formData, "agent_speedToLead_role") },
      quotation: { name: str(formData, "agent_quotation_name"), role: str(formData, "agent_quotation_role") },
      outbound: { name: str(formData, "agent_outbound_name"), role: str(formData, "agent_outbound_role") },
    },
    model: existing?.model,
  };

  await upsertBusinessConfig(config);
  revalidatePath("/[locale]/admin/businesses", "page");
  redirect(`/${locale}/admin/businesses`);
}

export async function deleteBusinessConfigAction(id: string): Promise<void> {
  await requireAdmin();
  if (id === "solartech") {
    // The default fallback business (see store.ts's STATIC_FALLBACK) — deleting
    // it would leave getBusinessConfig() with no default to fall back to.
    throw new Error("The default business can't be deleted.");
  }
  if (!(await isBusinessId(id))) return;
  await deleteBusinessConfig(id);
  revalidatePath("/[locale]/admin/businesses", "page");
}

export async function logoutAction(formData: FormData): Promise<void> {
  await clearAdminCookie();
  redirect(`/${str(formData, "locale") || "pl"}/admin`);
}
