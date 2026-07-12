# Session handoff — resume point

Written to bridge into a new chat session. Read this first, then the other
docs it links to, before doing anything else.

## What this project is

**LeadFlow AI** — a Kraków-based agency's sales demo: three Claude-powered
agents (speed-to-lead, quotation, outbound re-engagement) for home-services
contractors. Business context lives in `plan.md` (repo root) and
`docs/execution-plan.md` / `docs/pitch-notes.md`. The app itself is in
`web/` (Next.js 16 App Router). Read `web/docs/code-structure.md` first for
how the codebase is laid out — everything below assumes that context.

## What's been built, in order (all in this one long session)

1. **Polish/English i18n** — `/pl` and `/en` locale routing, full dictionary
   translation, `src/proxy.ts` locale redirect.
2. **Agent template system** — `BusinessConfig` + generic prompt builders so
   the same 3 agents run for any client vertical. See
   `docs/agent-templates.md`.
3. **Full visual redesign** — "Obsidian Signal" dark design system, GSAP
   motion, particle-field hero, redesigned demo/dashboard UI.
4. **Audit-driven hardening** — rate limiting, `VOICE_DEMO_PIN` guard on real
   Twilio calls, demo reset, business switcher on `/demo`, first-party
   analytics (`/api/track` + dashboard Analytics page), OG/sitemap/robots,
   Vitest regression suite (`npm test`, credential-free), CI workflow. See
   `docs/audit-plan.md` for the full list and status.
5. **Tech stack roadmap written** — `docs/tech-stack-roadmap.md`: tiered
   recommendations (DB, multi-tenant config, auth, integrations, billing).
6. **BusinessConfig → Supabase Postgres** (Tier 1 roadmap item #1): moved
   `BusinessConfig` from hardcoded TS files into a `business_configs` table
   (Drizzle ORM), with a PIN-gated `/admin/businesses` CRUD screen so
   onboarding a new client is a form, not a code change. `configs/*.ts`
   files still exist as seed data + in-process fallback if the DB is down.
7. **Multi-tenant CRM data → Supabase Postgres** (Tier 1 roadmap item #2,
   **this was the in-progress work when this session ended** — see below):
   moved `Lead`/`Appointment`/`Quote` from flat-file `data/db.json` into
   Postgres (`leads`/`appointments`/`quotes` tables), every record tagged
   with `businessId`, isolated per business. Analytics events deliberately
   stayed on flat-file (lower stakes, explicit scope boundary). Dashboard
   pages gained a `?business=<id>` switcher (`BusinessSwitcher.tsx`) as an
   interim stand-in for real auth.

## Exact state as of 2026-07-12 (updated after resuming this session)

The plan for item 7 (multi-tenant CRM data) is now **fully implemented and
verified end-to-end**, including the live browser walkthrough (plan steps
3–7 from `C:\Users\yasse\.claude\plans\snazzy-percolating-scott.md`) that was
left unfinished at the end of the prior session:

- `/pl/demo` full speed-to-lead flow → booking landed on
  `/pl/dashboard/appointments` for the default business (SolarTech). ✓
- `/pl/demo?business=budmax-remont` → same flow → new lead/appointment did
  **not** appear on the default dashboard, but did appear on
  `/pl/dashboard/leads?business=budmax-remont` (and `/appointments`). ✓
- `BusinessSwitcher` dropdown in the dashboard sidebar correctly flips
  stats/lists between businesses (5/3/1 leads/appts/quotes for SolarTech vs.
  1/1/0 for budmax-remont pre-reset). ✓
- Outbound demo "Restore demo data" button on `budmax-remont`: clears that
  business's data to empty (not reseeded, since only `DEFAULT_BUSINESS_ID`
  gets the curated seed) and left SolarTech's data completely untouched. ✓
- `/pl/dashboard/analytics` returns identical numbers regardless of
  `?business=` — confirmed out of scope as designed. ✓
- `npm run typecheck && npm run lint && npm test` re-run clean (21/21 tests
  passing) after the walkthrough.

**Bug found and fixed while resuming:** the dev server left running from the
prior (interrupted) session was stale — `/pl/dashboard` (the overview page)
hung forever on its Suspense loading skeleton (`aria-busy="true"`, never
resolving), on **every** business, not just `budmax-remont`. This reproduced
even on a hard reload. Root cause: the server process had been running since
*before* the `dashboard/loading.tsx` deletion documented below, and Turbopack
HMR hadn't fully invalidated the route's Suspense boundary — also visible as
stray 404/500s on hashed CSS chunk requests (stale asset manifest). **Fix was
operational, not a code change**: killed the stale `node.exe` process and
restarted via `npm run dev`; the overview page rendered correctly
immediately after. No source files were touched for this. If this recurs,
suspect the same stale-dev-server cause before touching `page.tsx`/`layout.tsx`.

**What's left:**
1. Commit the work — nothing has been committed yet; `git status` still
   shows ~28 changed/new files under `web/` (plus the rename of
   `src/app/page.tsx` → `src/app/[locale]/page.tsx` already staged). Ask the
   user before committing.

## Update (2026-07-13): Supabase Auth implemented and verified

The roadmap's last Tier 1 item is done — `/dashboard` is login-only now.
See `docs/tech-stack-roadmap.md`'s status block for the full description.
Key facts for a future session:

- `/pl/dashboard` redirects to `/pl/login` without a session; a logged-in
  user resolves to one business via `business_configs.owner_user_id`
  (`lib/auth.ts`). `BusinessSwitcher.tsx` is deleted; the `?business=` param
  is gone from the dashboard. `/pl/demo` stays public by design.
- Env vars: `NEXT_PUBLIC_SUPABASE_URL` (bare project URL — the user first
  pasted the Data API URL ending in `/rest/v1/`, which breaks auth with
  "Invalid path specified in request URL"), `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` — all set in `web/.env.local`. The project
  uses Supabase's new key format (`sb_publishable_...`/`sb_secret_...`),
  which works fine with `@supabase/ssr`.
- Two seeded logins exist (`scripts/seed-auth-users.ts`, idempotent):
  `solartech@leadflowai.demo` and `budmax@leadflowai.demo`. Their generated
  passwords were printed once in the 2026-07-13 session transcript — re-set
  them via the Supabase dashboard if lost; re-running the script does NOT
  regenerate passwords for existing users.
- Verified end-to-end in the browser: redirect, both logins see only their
  own data, logout, public demo + live agent reply still work.
- **A parallel background session ("Fix hardcoded agent/business names in
  PL dictionary") introduced dictionary *functions* (`formSubtitle: (…) =>`),
  re-breaking the documented "no functions in dictionary values" rule and
  500-ing every page.** Fixed in this session by converting them to
  prefix/mid/suffix string parts (see `speedToLeadDemo`/`quotationDemo` in
  both dictionaries). If demo copy needs interpolation again, use string
  parts, never functions.
- Still nothing committed — the diff now also includes all the auth work.

## A real bug found and fixed this session — know this before touching `loading.tsx` again

`src/app/[locale]/dashboard/loading.tsx` (a Suspense loading-skeleton file,
originally added as a P1 audit-plan fix) **was removed and must stay
removed**. Once the dashboard pages gained `searchParams` (for the
`?business=` switcher) combined with `export const dynamic =
"force-dynamic"`, that page's Suspense boundary **never resolved** — reliably
reproduced in both `next dev` and `next start` (production), isolated away
from the CRM/Postgres code (a standalone script proved `lib/crm.ts` queries
return in <500ms), and independent of caching. This matches the exact class
of issue `web/AGENTS.md` warns about ("this Next.js version has breaking
changes"). Root-caused, not worked around — documented in
`docs/audit-plan.md`'s status block. **Do not re-add a segment-level
`loading.tsx` under `dashboard/` without testing this exact combination
first** (searchParams + force-dynamic + segment loading.tsx).

## Other non-obvious things worth knowing

- **`DEFAULT_BUSINESS_ID` bundling gotcha**: Client Components must import
  it from `@/lib/agents/configs/constants` directly, **never** from the
  `@/lib/agents/configs` barrel — the barrel also statically re-exports
  `store.ts`'s DB-backed functions, and ES module semantics evaluate a
  whole module's imports even to reach one unused export, which drags the
  `postgres` driver (Node-only: `net`/`tls`/`fs`) into the browser bundle
  and breaks `next build`. See the comment in `constants.ts`.
- **Tests stay credential-free on purpose.** `tests/agents-flow.test.ts`
  mocks both `@/lib/agents/configs` and `@/lib/crm` with in-memory fakes
  (the CRM mock reuses the real `curatedSeedFor()` via `vi.importActual` so
  seed data has one source of truth). `npm test` must never require
  `DATABASE_URL` — this was verified repeatedly and is load-bearing for CI.
- **Supabase connection string**: the real password contains a literal `?`
  that must be percent-encoded as `%3F` in `DATABASE_URL` — already fixed
  in `.env.local`, just noting why in case it comes up again.
- **`drizzle-kit` / seed scripts need `@next/env`** (`loadEnvConfig`)
  explicitly — they run as standalone Node processes and don't get
  Next.js's automatic `.env.local` loading. Already wired into
  `drizzle.config.ts` and both `scripts/seed-*.ts` files.
- **Two Postgres tables' worth of seed data**: `npm run db:seed` runs
  `scripts/seed-business-configs.ts` then `scripts/seed-crm-data.ts` in
  sequence. Both already ran successfully against the real Supabase DB this
  session.

## Immediate next step after this plan closes out

Per the roadmap and a direct conversation with the user: **Supabase Auth**
is next (Tier 1's last item) — a logged-in session should resolve to a
`businessId` server-side instead of trusting the `?business=<id>` query
param the dashboard currently uses. Not started. See the "Auth" row in
`docs/tech-stack-roadmap.md` for the rationale (Supabase over Clerk, since
Postgres is already there).
