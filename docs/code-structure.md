# Code structure

How `web/` is organized and how a request flows through it. For the agent
template/config system specifically, see [agent-templates.md](agent-templates.md).
For diagrams of the whole pipeline, see [architecture.md](architecture.md).

## Top-level layout

```
web/
├── src/
│   ├── app/                 Next.js App Router — pages and API routes
│   │   ├── [locale]/        every page, localized (pl/en) — see "Routing & i18n" below
│   │   ├── api/              route handlers — never localized, language is a request param instead
│   │   └── globals.css
│   ├── components/          React components (mostly client components)
│   │   ├── motion/           GSAP primitives: MotionOrchestrator (scroll reveals
│   │   │                     via data-reveal), MagneticButton, Preloader
│   │   ├── home/             HeroCanvas — the landing hero's particle field
│   ├── lib/                 everything that isn't a page or a route handler
│   │   ├── agents/           the agent template system — see agent-templates.md
│   │   │   └── configs/       store.ts = DB-backed lookup, *.ts = seed/fallback data
│   │   ├── i18n/             locale list + dictionaries + getDictionary()
│   │   ├── db.ts             flat-file store for analytics events only + nextBusinessSlots()
│   │   ├── crm.ts             Postgres-backed leads/appointments/quotes, all scoped by businessId
│   │   ├── smsSessions.ts     in-memory two-way-SMS conversation state, keyed by phone (24h TTL)
│   │   ├── schema.ts          Drizzle table defs: business_configs, leads, appointments, quotes
│   │   ├── postgres.ts        lazy Drizzle client singleton (needs DATABASE_URL)
│   │   ├── adminAuth.ts       PIN gate for /admin (ADMIN_PIN env var)
│   │   ├── auth.ts            getCurrentUser()/getSessionBusinessId() — the /dashboard login gate
│   │   ├── supabase/server.ts per-request Supabase client (Server Components/Actions)
│   │   ├── anthropic.ts      Claude/Vertex/mock client selection
│   │   ├── mock.ts           the no-API-key mock provider
│   │   ├── rateLimit.ts      in-memory per-IP limits for the paid endpoints
│   │   ├── analytics.ts      client-side track() helper → /api/track
│   │   └── ...               format.ts, contact.ts, twilio.ts, useVoice.ts, callSessions.ts, site.ts
│   └── proxy.ts              locale redirect + Supabase session refresh (Next 16's renamed "middleware")
├── drizzle.config.ts          drizzle-kit config (schema path, DATABASE_URL)
├── drizzle/                   generated SQL migrations (npm run db:generate)
├── scripts/                   seed-business-configs.ts + seed-crm-data.ts + seed-auth-users.ts — npm run db:seed
├── data/db.json              analytics events only now — see lib/db.ts
├── tests/                    Vitest regression suite (run with `npm test`)
└── docs/                     this folder
```

Every `Lead`/`Appointment`/`Quote` carries a `businessId` (see
`docs/tech-stack-roadmap.md` "Multi-tenant CRM data") — every `lib/crm.ts`
function takes a `businessId` as its first argument, and lookups-by-id
filter on both `businessId` and `id` together so one business can never
read another's records. On the dashboard, "which business am I looking at"
is resolved from a real login session (`lib/auth.ts`'s
`getSessionBusinessId()`, backed by Supabase Auth — see
`docs/tech-stack-roadmap.md` "Auth") via `business_configs.owner_user_id`,
**not** a query param — `/dashboard` requires a session and redirects to
`/[locale]/login` otherwise. The old `?business=<id>` switcher is gone; each
login owns exactly one business.

Notable API routes beyond the three agents: `/api/track` (first-party demo
analytics, allowlisted events), `/api/admin/reset` (reseeds one business's
CRM data, keeps analytics), `/api/voice/start` (real Twilio call — guarded
by `VOICE_DEMO_PIN` plus per-IP and global daily rate limits; stays
single-tenant, always filed under the default business), and the real
two-way SMS pair: `/api/sms/start` (same PIN + rate-limit guards as voice;
sends Ola's first text and opens an `lib/smsSessions.ts` session) and
`/api/sms/inbound` (Twilio Messaging webhook — X-Twilio-Signature
validated, per-phone flood cap, replies in-band as TwiML, books
appointments exactly like the voice gather route). `/admin/businesses`
(under `[locale]`, PIN-gated by `ADMIN_PIN`) is the create/edit screen for
`BusinessConfig` records — see [agent-templates.md](agent-templates.md); this
is a separate, deliberately simpler mechanism for the agency owner's own
internal use, not the client-facing `/dashboard` login.

## Routing & i18n

Every page lives under `src/app/[locale]/...` — `[locale]` is a dynamic
segment constrained to `"pl" | "en"` (see `src/lib/i18n/locales.ts`).
`src/app/[locale]/layout.tsx` is the actual **root layout** (it defines
`<html>`/`<body>`) even though it's nested one level down — there's no
`layout.tsx` directly under `src/app/`, because API routes are route
handlers, not React pages, so they don't need one.

`src/proxy.ts` (Next.js 16 renamed the `middleware.ts` convention to
`proxy.ts` — see the note in `web/AGENTS.md`) redirects any unprefixed path
(`/`, `/demo`, ...) to `/pl/...` or `/en/...`, picked from the browser's
`Accept-Language` header and defaulting to Polish. Once a request has a
locale prefix, `[locale]/layout.tsx` loads the matching dictionary with
`getDictionary(locale)` and passes it down as a plain prop.

**Passing the dictionary down**: pages are Server Components; most
interactive pieces (`Nav`, `ChatUI`, the three demo components, etc.) are
Client Components. The dictionary crosses that boundary as a normal prop, so
it must stay plain, serializable data — **no functions** in dictionary
values (a past bug: `resultTitle: (jobType) => ...` crashed with "Functions
cannot be passed directly to Client Components"). Where a string needs
interpolation, the dictionary holds a prefix/suffix pair instead
(`ringingMessagePrefix` / `ringingMessageSuffix`) and the component
concatenates them around the dynamic value.

API routes (`src/app/api/**/route.ts`) are **not** locale-prefixed — they
read a `language: "pl" | "en"` field from the request body/query instead.
The demo components read the page's `locale` param and pass it as
`language` on every fetch.

## Request flow: one demo chat turn

1. User types a reply in `SpeedToLeadDemo` / `QuotationDemo` / `OutboundDemo`
   (all Client Components) and it `fetch`es `/api/agents/<agent>` with the
   conversation history, business fields, and `language: locale`.
2. The route handler resolves a Claude client via `getClient()`
   (`src/lib/anthropic.ts`) — real Anthropic key, Vertex, or the scripted
   `mock` provider (`src/lib/mock.ts`), controlled by `AGENT_PROVIDER`.
3. The route builds a system prompt + tool schemas from
   `lib/agents/configs` + `lib/agents/prompts` + `lib/agents/tools.ts` (see
   [agent-templates.md](agent-templates.md)) and calls `client.messages.create`.
4. If the model calls a tool (`book_appointment`, `generate_quote`,
   `close_lead`), the route writes to Postgres via `lib/crm.ts`, scoped to
   the resolved `businessId`, and returns the reply + tool result as JSON.
5. The component renders the reply and, on a tool result, a result card.
   The write is immediately visible on `/[locale]/dashboard/*` for whoever
   is logged in as that business (those pages resolve `businessId` from the
   session via `lib/auth.ts`, then call `getLeads()` / `getAppointments()` /
   `getQuotes()` from `lib/crm.ts` — no caching, `export const dynamic =
   "force-dynamic"`).

The real-phone-call path (`src/app/api/voice/*`, Twilio) reuses the exact
same prompt/tool builders via `lib/agents/olaAgent.ts`, so the agent behaves
identically whether the lead is typing or talking.

## Where to add things

- **A new page**: add it under `src/app/[locale]/`, read `params.locale`,
  call `getDictionary(locale)`, add its copy to both
  `lib/i18n/dictionaries/pl.ts` and `en.ts` (TypeScript will error if a key
  is missing from `en.ts`, since it's typed as `typeof pl`).
- **A new agent or a new client/vertical**: see
  [agent-templates.md](agent-templates.md).
- **A new locale**: add it to `LOCALES` in `lib/i18n/locales.ts`, add a
  dictionary file, add a language variant to every business's `pricingGuide`
  (via `/admin/businesses/<id>` for real records, `configs/*.ts` for the
  seed/fallback data), and extend the `language` union everywhere it's
  currently `"pl" | "en"` (agents `types.ts`, `db.ts`, `format.ts`, `twilio.ts`).
