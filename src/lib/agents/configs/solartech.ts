import type { BusinessConfig } from "../types";

// The original (and default) template instance: SolarTech Kraków, a
// photovoltaic / heat-pump installer.
//
// This file is no longer the runtime source of truth — BusinessConfig now
// lives in Postgres (see store.ts) and is edited via /admin/businesses.
// This object still serves two purposes: (1) seed data for
// `npm run db:seed` (scripts/seed-business-configs.ts), and (2) an
// in-process fallback store.ts falls back to if the DB is unreachable, so
// local dev and the live demo still work before Supabase is configured.
// To onboard a real new client, use the admin screen, not a new file here
// — see docs/agent-templates.md.
export const solartech: BusinessConfig = {
  id: "solartech",
  businessName: "SolarTech Kraków",
  city: "Kraków",
  vertical: "photovoltaic and heat pump installer",
  agents: {
    speedToLead: { name: "Ola", role: "intake agent" },
    quotation: { name: "Kuba", role: "estimator" },
    outbound: { name: "Marek", role: "re-engagement agent" },
  },
  services:
    "photovoltaic (solar PV) systems, energy storage, and heat pumps for homes and small businesses in Kraków, Poland",
  appointmentLabel: "free on-site audit (bezpłatny audyt / wizja lokalna)",
  qualifyingQuestions: [
    "is this about photovoltaics, a heat pump, or both",
    "is it a single-family house or a business / do they own the roof",
    "roughly what their electricity bills are or the house size in m²",
  ],
  pricingGuide: {
    pl: `Cennik w złotówkach (punkt wyjścia, dostosuj do złożoności; ceny brutto, w tym 8% VAT dla domów jednorodzinnych):
- Instalacja fotowoltaiczna (panele + falownik + montaż): 4 000–5 500 zł za kWp; typowa instalacja domowa to 5–10 kWp
- Zasada doboru mocy: roczne zużycie w kWh ÷ 1000 ≈ potrzebne kWp; rachunek ~300 zł/mc ≈ 4–5 kWp
- Magazyn energii: 3 000–4 500 zł za kWh pojemności (typowo 5–10 kWh)
- Pompa ciepła powietrze-woda z montażem: 35 000–60 000 zł zależnie od mocy (8–16 kW) i zasobnika/CWU
- Optymalizatory / trudny dach (blachodachówka płaska, wiele połaci, grunt): doliczyć 10–15%`,
    en: `Pricing guide in Polish złoty (use as a basis, adjust for complexity; prices are gross, incl. 8% VAT for single-family homes):
- Photovoltaic installation (panels + inverter + install): 4,000–5,500 zł per kWp; typical home system is 5–10 kWp
- Sizing rule of thumb: yearly consumption in kWh ÷ 1000 ≈ kWp needed; monthly bill of ~300 zł ≈ 4–5 kWp
- Energy storage: 3,000–4,500 zł per kWh of capacity (typical 5–10 kWh)
- Air-to-water heat pump with installation: 35,000–60,000 zł depending on power (8–16 kW) and buffer/hot-water tank
- Optimizers / difficult roof (flat metal tile, many faces, ground-mount): add 10–15%`,
  },
  subsidyNote:
    "Mój Prąd (PV/storage) and Czyste Powietrze (heat pumps) subsidies — the company handles the paperwork, details at the audit.",
};
