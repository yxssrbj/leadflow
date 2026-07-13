# Tech stack roadmap — scaling beyond the demo

Recommendations for evolving the current stack (Next.js + flat-file
`db.json` + direct Anthropic SDK calls, all described in
[code-structure.md](code-structure.md)) into something that scales and is
easy to onboard real customers onto. Ordered by leverage for a solo-founder
sales motion (see `plan.md`), not by technical interest — read the "why"
column before scheduling anything, and don't build ahead of actual need.

## Tier 1 — before the first real pilot

> **Status (2026-07-12): all four Tier 1 rows executed.** Supabase Postgres
> + Drizzle is live; `BusinessConfig` lives in `business_configs`
> (`src/lib/schema.ts`), edited via a PIN-gated `/admin/businesses` screen
> instead of TypeScript files. `Lead`/`Appointment`/`Quote` also moved into
> Postgres (`leads`/`appointments`/`quotes` tables), each scoped by
> `businessId` — see `lib/crm.ts` and `docs/code-structure.md`. The two seed
> configs (`solartech`, `budmax-remont`) double as an in-process fallback if
> the DB is unreachable, so local dev and the live demo still work without
> Supabase configured. **Auth is done**: `/dashboard` requires a real
> Supabase Auth session (`lib/auth.ts`, `lib/supabase/server.ts`,
> `src/proxy.ts`) that resolves straight to one `businessId` via
> `business_configs.owner_user_id` — the old `?business=<id>` switcher is
> gone entirely, not just hidden. `solartech` and `budmax-remont` both have
> real login accounts (`scripts/seed-auth-users.ts`, run via `npm run
> db:seed`). The public sales demo (`/demo`) is untouched — only the CRM
> dashboard moved behind login. The admin PIN gate on `/admin/businesses` is
> a separate, deliberately simpler mechanism for the agency owner's own
> internal config screen, not for pilot clients — left as-is.

| Concern | Recommendation | Why this one |
|---|---|---|
| **Database** | Postgres via **Supabase** or **Neon** + **Drizzle** (or Prisma) | `lib/db.ts`'s flat-file `data/db.json` (see `docs/audit-plan.md`) breaks the moment two customers' data needs to coexist safely — no concurrent-write safety, no backups, no isolation. Supabase also bundles auth + storage, which is needed anyway (see Auth below). |
| **Multi-tenant config** | Move `BusinessConfig` (currently `lib/agents/configs/*.ts`, see `agent-templates.md`) from TypeScript files into DB rows, editable via a simple internal admin screen | This is the single highest-leverage change for "easier to set up for customers." Today, onboarding a new client means writing code and deploying. It should mean filling out a form. |
| **Multi-tenant CRM data** | Move `Lead`/`Appointment`/`Quote` into the same Postgres database, tagged with `businessId` | `BusinessConfig` being multi-tenant doesn't matter if the leads it generates all land in one shared, untagged bucket — this is the piece that makes "each client's own dashboard" actually meaningful once Auth restricts who can query which `businessId`. |
| **Auth** | **Supabase Auth** (Clerk was the original pick when Postgres provider was still open — now that Supabase is already the DB, reuse it) | Each pilot client needs their own login to their own dashboard — right now `/dashboard` is a public, unauthenticated URL, gated only by a `?business=<id>` query param (flagged as a P1 gap in `audit-plan.md`). A logged-in session should resolve to a `businessId` server-side instead of trusting a query param. |

## Tier 2 — once a pilot is signed

> **Status (2026-07-13): Real SMS row executed** (pulled forward of a
> signed pilot by explicit user decision). The speed-to-lead agent now runs
> a real two-way SMS conversation: the demo's "Napisz do mnie" button sends
> Ola's first text via the Twilio Messaging API (`/api/sms/start`), the
> lead replies from their phone to the Twilio number, and the webhook
> (`/api/sms/inbound`, signature-validated) continues the conversation to a
> booked appointment. Same guards as real calls (`VOICE_DEMO_PIN` +
> rate limits, plus a per-phone flood cap), same single-tenant scope
> (`DEFAULT_BUSINESS_ID`), sessions in `lib/smsSessions.ts` (in-memory,
> 24h TTL — same single-instance caveat as `callSessions.ts`). The
> quotation and outbound agents still don't text — that part of this row
> remains open for a real pilot.

| Concern | Recommendation | Why |
|---|---|---|
| **Real SMS** | Twilio Messaging API (same account already used for Twilio Voice) | The sales pitch is "texts your leads back," but today only the demo simulates that over a chat UI — the quotation and outbound agents never send an actual text. |
| **Calendar sync** | Google Calendar API | "Booking" needs to land on the client's real calendar, not just a `db.json` record. |
| **Lead/CRM handoff** | One generic outbound webhook per client, with native Zapier/Make support as a later nice-to-have | Contractors already use *something* (a spreadsheet, a simple CRM). Don't build bespoke integrations per client — give them one webhook payload they wire up themselves. |
| **Scheduled/batch jobs** | **Inngest** or **Trigger.dev** | Marek's re-engagement flow (`lib/agents/prompts/outbound.ts`) needs to run on a schedule/batch against the dead-lead list, not just react synchronously to a page load. Both are low-ops, Vercel-friendly durable-function runners built for exactly this. |
| **Rate limiting at scale** | Swap `lib/rateLimit.ts`'s in-memory `Map` for **Upstash Redis** | Only matters once the app runs more than one server instance (serverless/multi-region). The current implementation already isolates this behind two functions (`rateLimit`, `clientIp`) specifically so the swap is contained. |

## Tier 3 — once there's real usage/revenue

| Concern | Recommendation | Why |
|---|---|---|
| **Billing** | Stripe | Already the plan in `docs/execution-plan.md` — monthly retainer + setup fee via Stripe Invoicing, self-serve upgrades later via Stripe Checkout. |
| **Error observability** | Sentry | `console.error` in `[locale]/error.tsx` is fine for local dev; production needs real alerting. |
| **Product analytics** | **PostHog**, replacing the custom `/api/track` → `db.json` events system (`docs/audit-plan.md` §"Analytics") | The hand-rolled system is the right call at zero users; once there's real traffic, funnels/session-replay from PostHog beat a bespoke dashboard. |
| **Embeddable widget** | A small JS snippet + public API endpoint so a client can drop the chat agent onto *their own* website | Probably the single biggest unlock for "integrate for customers" — but it's a real product feature, not infrastructure, so sequence it after the Tier 1 multi-tenant work, not before. |

## Where to start

The Tier 1 database + multi-tenant config move is the one item that
actually changes "onboarding a client" from a code change into a form
submission. Everything else compounds on top of that foundation, so it's
the natural first step whenever this work is picked up.
