export function formatDate(iso: string, locale: "pl" | "en" = "pl"): string {
  return new Date(iso).toLocaleDateString(locale === "en" ? "en-US" : "pl-PL", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Amounts are always PLN — this is a Poland-first business (see plan.md) — so
// only the number formatting locale changes, not the currency itself.
export function formatCurrency(amount: number, locale: "pl" | "en" = "pl"): string {
  return amount.toLocaleString(locale === "en" ? "en-US" : "pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  });
}
