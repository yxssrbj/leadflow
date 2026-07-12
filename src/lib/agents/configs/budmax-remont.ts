import type { BusinessConfig } from "../types";

// Second example vertical, proving the template generalizes beyond solar:
// a general renovation contractor (the next niche after solar/heat pumps —
// see plan.md §3). Switch a request's businessId to "budmax-remont" to demo
// it (e.g. /demo?business=budmax-remont).
//
// Like solartech.ts, this is no longer the runtime source of truth — it's
// seed data for `npm run db:seed` plus store.ts's DB-unavailable fallback.
// Onboard a real new client via /admin/businesses/new. See docs/agent-templates.md.
export const budmaxRemont: BusinessConfig = {
  id: "budmax-remont",
  businessName: "BudMax Remonty",
  city: "Kraków",
  vertical: "renovation and interior fit-out contractor",
  agents: {
    speedToLead: { name: "Iga", role: "intake agent" },
    quotation: { name: "Bartek", role: "estimator" },
    outbound: { name: "Rafał", role: "re-engagement agent" },
  },
  services:
    "full apartment and house renovations, bathrooms, kitchens, and interior fit-outs for new units in Kraków, Poland",
  appointmentLabel: "free on-site measurement visit (bezpłatny obmiar / wizja lokalna)",
  qualifyingQuestions: [
    "is this a full apartment/house renovation or a single room (e.g. bathroom, kitchen)",
    "the square footage and roughly when they want to start",
    "do they already have a design/materials, or do they need a full turnkey service",
  ],
  pricingGuide: {
    pl: `Cennik w złotówkach (punkt wyjścia, dostosuj do zakresu; ceny brutto):
- Remont generalny mieszkania (bez mebli): 1 800–2 800 zł za m², zależnie od standardu
- Remont łazienki (do 6 m², pełny zakres): 18 000–32 000 zł
- Remont kuchni (zabudowa + instalacje, bez AGD): 15 000–35 000 zł
- Wykończenie deweloperskie "pod klucz": 1 400–2 200 zł za m²
- Prace dodatkowe (przeróbki instalacji elektrycznej/hydraulicznej, skucie ścian): doliczyć 10–20%`,
    en: `Pricing guide in Polish złoty (use as a basis, adjust for scope; prices are gross):
- Full apartment renovation (excl. furniture): 1,800–2,800 zł per m², depending on finish level
- Bathroom renovation (up to 6 m², full scope): 18,000–32,000 zł
- Kitchen renovation (built-ins + utilities, excl. appliances): 15,000–35,000 zł
- Turnkey fit-out for a new-build unit: 1,400–2,200 zł per m²
- Extra work (electrical/plumbing rework, wall demolition): add 10–20%`,
  },
  subsidyNote: "",
};
