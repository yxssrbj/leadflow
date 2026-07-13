# LeadFlow AI — Audit Plan

A structured assessment of `web/` as it stands today: what's functionally
incomplete or risky, what regression exposure exists, and what to build next.

> **Status (2026-07-12): executed.** Every feasible item below has been
> implemented — all P0s (rate limiting via `lib/rateLimit.ts`, the
> `VOICE_DEMO_PIN` guard on real calls, the demo-reset button, the
> `?business=` switcher), the P1 fixes (`currency` field removed, Kokoro
> widget gated to dev/`?dev=1`, branded `error.tsx`/404), the analytics
> near-term item (`/api/track` + the dashboard Analytics page), the P2
> metadata (OG/Twitter cards, `sitemap.ts`, `robots.ts`), and the regression
> baseline (Vitest suite in `tests/`, `npm test`, CI workflow in
> `.github/workflows/ci.yml`). Deliberately **not** done: the placeholder
> phone number in `lib/contact.ts` (needs your real number — a business
> decision), the mid/long-term roadmap items (pilot-stage work), and an
> automated axe/Lighthouse pass. **Reverted after shipping**: a
> `dashboard/loading.tsx` skeleton was added, then removed once the
> multi-tenant CRM migration (`docs/tech-stack-roadmap.md`) added
> `searchParams` to the dashboard pages — that combination with a segment
> `loading.tsx` never resolves its Suspense boundary on this Next.js version
> (16.2.10; reproduced identically in `next dev` and `next start`, isolated
> away from the CRM/Postgres code, matches the "breaking changes" warning in
> `web/AGENTS.md`). The dashboard's original blank-flash gap is back until a
> Next.js upgrade or a different loading-state approach is worth revisiting.
> The sections below are kept as originally written, as the rationale for
> what was built.

Priority key: **P0** = fix before showing this to a real prospect/client,
**P1** = fix before the first paid pilot, **P2** = roadmap / nice-to-have.

---

## 1. Functionality audit

### P0 — Cost & abuse exposure

| Issue | Why it matters | Fix |
|---|---|---|
| No rate limiting on `/api/agents/*` | Once `ANTHROPIC_API_KEY` is set, every chat turn is a paid Claude call. The demo is public — anyone (or a bot) can hammer these routes and run up the bill with no cap. | Add a lightweight per-IP rate limit (e.g. `Map`-based token bucket in-memory for a single-instance deploy, or Upstash/Vercel KV if deployed serverless) on the three agent routes and `/api/voice/start`. |
| No guard on `/api/voice/start` (real Twilio calls) | This route places an actual outbound phone call with **no auth, no limit, no confirmation step**. A stranger who finds the endpoint could dial arbitrary numbers on your Twilio account. This is the single highest-risk item in the app. | At minimum: rate-limit by IP + require the request to include a shared demo secret (env var) checked server-side; ideally gate the "real call" button behind a short admin PIN prompt before it's shown in a public pitch link. |
| `ANTHROPIC_API_KEY` / Twilio creds have no spend caps enforced by the app | The app trusts provider-side spend limits (console.claude.com, Twilio) instead of its own. Fine for now, but not defense-in-depth. | Document required console-side spend caps in `.env.local.example` (partially done); consider a daily call/message counter written to `db.json` that hard-stops past a threshold. |

### P0 — Data isolation

> **Status (2026-07-12): resolved between businesses, and dashboard access
> is now real auth — still shared within one business's demo visitors.**
> Leads/appointments/quotes moved from `data/db.json` into Postgres with a
> `businessId` on every record (see `docs/tech-stack-roadmap.md`
> "Multi-tenant CRM data" and `lib/crm.ts`) — two different businesses'
> data can no longer mix, verified end-to-end including a dedicated
> cross-tenant-isolation test. `/dashboard` also moved behind a real
> Supabase Auth login (`docs/tech-stack-roadmap.md` "Auth", `lib/auth.ts`) —
> the old public `?business=<id>` query param is gone, so a business's CRM
> data can no longer be viewed by anyone who just knows its id. **What this
> does *not* fix**: the public `/demo` page itself stays anonymous and
> unauthenticated by design (that's the point — it's the sales demo
> prospects click into cold), so within a single business, every `/demo`
> visitor's activity still lands in the same bucket (no per-visitor session
> scoping). Don't overstate this in a pitch: it means "your dashboard is
> private and your data can't leak into another client's view," not "every
> demo visitor gets their own sandbox."

| Issue | Why it matters | Fix |
|---|---|---|
| `data/db.json` is one shared file for **every** visitor | If two prospects run the demo at the same time (or you demo it live while a previous session's data is still there), their leads/quotes/appointments all land in the same dashboard. For a *"watch it happen live"* pitch this is currently fine solo, but breaks the moment you send the demo link to multiple prospects in parallel, or leave it running between pitches. | Short term: a "reset demo data" button in the dashboard (currently the only reset path is manually deleting the file on the server). Medium term: scope records by a session/visitor id (cookie) so each visitor sees only their own activity, with a separate "aggregate" view for you. |
| `budmax-remont` config exists but is unreachable from the UI | The template system (Phase A of the earlier redesign) proves multiple businesses can run on the same agents, but there's no way to actually demo that — `businessId` is only settable via a raw API request body. | Add a hidden/dev-only business switcher on the demo page (e.g. a query param `?business=budmax-remont` wired through to the fetch calls) so you can actually show this in a sales conversation about "can you do this for a different vertical." |

### P1 — Inconsistencies from the recent work

| Issue | Why it matters | Fix |
|---|---|---|
| `BusinessConfig.currency` field is declared but never read | `lib/format.ts#formatCurrency` hardcodes `"PLN"` regardless of `config.currency`. Not a live bug (every config today is PLN), but it's a landmine: add a USD-priced client config later and every price on their dashboard/quotes will silently render as PLN. | Either wire `formatCurrency` to take the config's currency, or remove the field until it's actually used — don't leave a config knob that looks functional but isn't. |
| Placeholder contact info still live | `lib/contact.ts` ships a fake phone number (`+48 500 123 456`) with a `// TODO` comment. If this demo link goes out before that's swapped, a real prospect could call a dead/wrong number from the Contact section. | Replace before the first outreach campaign — this is a checklist item in `docs/execution-plan.md` already, just flagging it's still outstanding. |
| Outbound demo's "empty state" tells the user to SSH in and delete a file | `OutboundDemo.tsx` shows *"delete `web/data/db.json` and restart"* once all seeded dead leads are revived. Fine for you testing locally; not fine mid-pitch with a prospect watching. | Add a "reseed demo data" server action/button instead of a filesystem instruction. |
| Kokoro voice test widget is visible on the public `/demo` page | It's explicitly commented as "internal tool — not part of the customer-facing demo," but it still renders on the same page a prospect would see, undermining the polish of the pitch. | Gate it behind `NODE_ENV !== "production"` or a `?dev=1` query flag so it never ships to a real demo link. |

### P1 — Missing UX safety nets

- **No custom `error.tsx` / `not-found.tsx`** — a runtime error or a bad URL currently falls through to Next.js defaults, which don't match the new dark "Obsidian Signal" design at all. Jarring mid-pitch.
- **No `loading.tsx` for the dashboard routes** — `force-dynamic` pages have a blank flash while `db.json` is read; small, but on a slower connection during a live demo it looks like a stall.
- **No visible error state if the demo runs out of API credit** — `clientError()` returns a decent message today, but it's only ever shown inside the chat bubble; there's no toast/banner if the *page* itself fails to load leads/quotes (e.g. a corrupted `db.json`).

### P2 — Polish gaps

- No Open Graph / Twitter card metadata — sharing the demo link in Slack/LinkedIn/WhatsApp shows a bare title, no preview image. Matters a lot for a sales asset that gets forwarded.
- No `sitemap.xml` / `robots.txt` — irrelevant for a private sales demo, relevant the moment this becomes a real marketing site.
- No analytics of any kind — you currently have no way to know how many prospects opened the demo link, which tab they tried first, or where they dropped off. For a solo-founder sales motion this is the single most useful missing feature (see roadmap below).
- Accessibility pass was done for the redesign (focus rings, `aria-*`, reduced-motion) but hasn't been run through an automated checker (axe/Lighthouse) — worth a pass before wide distribution.

---

## 2. Regression risk & testing plan

**Current state: zero automated tests.** `package.json` only has `dev`,
`build`, `start`, `lint`. Every verification so far (including the redesign)
has been manual browser walkthroughs. That's acceptable at demo-stage
velocity, but every future change risks silently breaking:

- The mock provider's regex-based parsing (`lib/mock.ts`) — it depends on
  the exact phrasing of `openingLine()` in `prompts/shared.ts`. Change the
  wording there without touching `mock.ts` and the mock demo silently starts
  showing "Agent" / "the company" instead of real names (it has a fallback,
  so it fails quietly, not loudly — the worst kind of regression).
- The `pl`/`en` dictionary parity — `en.ts` is typed as `typeof pl`, so a
  *missing* key is caught by `tsc`, but a *wrong* value (mistranslation, a
  dropped `{name}` interpolation) is not caught by anything.
- The tool-call → `db.json` write path — nothing currently asserts that
  `book_appointment` / `generate_quote` / `close_lead` actually produce
  correctly-shaped records.
- The `[locale]` routing + `proxy.ts` redirect logic — easy to break with a
  routing refactor and only discoverable by manually hitting `/`.

### Recommended baseline (P1 — before the first pilot)

1. **Unit tests for `lib/mock.ts` and `lib/agents/prompts/*`** (Vitest — no
   need for a browser). Assert: given a known system prompt + message
   history, the mock returns the expected tool call shape and the correct
   persona/business name extraction. This is the highest-value test to add
   first because it's the thing most likely to break silently.
2. **A translation-parity check.** Not full i18n QA — just a script that
   walks `en.ts` and `pl.ts` and flags any string that's identical in both
   (usually a sign a value wasn't translated) or where an interpolation
   token count doesn't match. Cheap to write, catches real mistakes.
3. **One Playwright smoke test per critical path**, run in CI on every PR:
   - `/` redirects to `/pl` or `/en` correctly.
   - Full speed-to-lead chat flow (mock provider) ends in a booked
     appointment that then appears on `/dashboard/appointments`.
   - Same for quotation → `/dashboard/quotes` and outbound decline →
     lead closed.
   This is exactly the manual walkthrough already done twice by hand in this
   session — turning it into a 40-line Playwright script means it never has
   to be done by hand again.
4. **CI workflow** (`.github/workflows/ci.yml` once this repo is pushed to
   GitHub): run `tsc --noEmit`, `eslint`, and the above tests on every push.
   Nothing here needs to be fancy — the goal is just "a broken build can't
   land unnoticed."

### Manual regression checklist (until the above exists)

Run this after any change to `lib/agents/**`, `lib/i18n/**`, or routing:

- [ ] `npx tsc --noEmit` and `npx eslint src` clean
- [ ] `/` → redirects to `/pl` (default) and `/en` (via `Accept-Language`)
- [ ] Full chat flow, mock provider, in **both** languages: speed-to-lead
      (booking), quotation (quote), outbound (both booking and decline paths)
- [ ] New records appear correctly on the matching `/dashboard/*` page
- [ ] PL⇄EN switcher preserves the current path
- [ ] Mobile viewport: nav burger opens/closes, no horizontal scroll
- [ ] `prefers-reduced-motion`: hero/marquee/reveals stop animating,
      content still fully visible

---

## 3. Roadmap — what to add next

Ordered by leverage for a solo-founder sales motion (see `plan.md`), not by
technical interest.

### Near-term (next 1–2 weeks — makes the demo sell better)

1. **Demo analytics.** Track: link opened, which agent tab was tried, chat
   turns before drop-off, whether a booking/quote was completed. Even a
   simple `POST /api/track` writing to `db.json` (or a free tier of
   Plausible/PostHog) tells you which part of the pitch is actually landing.
   This is the highest-leverage addition on this whole list — it turns the
   demo from "a thing you show" into "a thing that tells you how to sell."
2. **"Reset my demo" self-serve button** — replaces the filesystem-delete
   empty state (P1 above) and doubles as the fix for the shared-`db.json`
   problem for solo use.
3. **Business/vertical switcher on the demo page** — makes the
   `budmax-remont` template config (and any future vertical) actually
   demoable, which directly supports the "renovation contractors next"
   milestone in `plan.md` §6.
4. **Open Graph card** for the demo link — a proper preview image/title when
   the link is pasted into LinkedIn/WhatsApp/email, since that's how it'll
   actually be distributed to prospects.

### Mid-term (once the first 1–2 pilots are signed)

5. **Real CRM/calendar integration** — right now "booking" writes to
   `db.json`; a real pilot needs it writing to the client's actual calendar
   (Google Calendar API) and optionally syncing leads to whatever CRM they
   already use (even a Google Sheet via a simple webhook is enough for v1).
6. **Real SMS delivery (Twilio Messaging)** — the pitch narrative is "texts
   your leads back," but today only the phone-call path uses real Twilio;
   the chat demo is a simulated SMS thread. Wiring actual SMS send/receive
   is the natural "make the pilot real" step referenced in `plan.md` §6.
   *Status (2026-07-13): done for the speed-to-lead agent — real two-way
   SMS via `/api/sms/start` + `/api/sms/inbound`, see
   `docs/tech-stack-roadmap.md` Tier 2 status note. Quotation/outbound
   agents still simulate.*
7. **Per-client auth on the dashboard** — once a pilot client has their own
   real leads in there, the dashboard can't stay a public unauthenticated
   URL. Simplest viable version: a per-client magic-link or basic-auth
   gate, not a full user system.
8. **Prompt-tuning feedback loop** — a lightweight way to mark a real
   conversation as "good" / "needs fixing" from the dashboard, so tuning
   `configs/*.ts` and `prompts/*.ts` (per `docs/agent-templates.md`) is
   driven by real transcripts instead of guesswork.

### Long-term / nice-to-have

9. **Structured admin panel for configs** — editing `BusinessConfig` via a
   form instead of a TypeScript file, once there are enough clients that
   hand-editing source files per onboarding doesn't scale.
10. **Multi-language beyond PL/EN** — the i18n system (`lib/i18n/*`) was
    built generically enough that adding a third locale is mostly "add a
    dictionary + extend a few unions" (documented in
    `docs/code-structure.md`), worth doing only once there's an actual
    market need (e.g. a German-speaking client base).
11. **A real database** — `data/db.json` is fine for a demo and even a
    handful of early pilots, but won't hold up past that (no concurrent
    write safety, no backups, no query performance at scale). Swap for
    Postgres/SQLite behind the same `lib/db.ts` function signatures when
    it becomes the bottleneck — not before.

---

## Suggested order of execution

1. Fix the two P0 cost/abuse gaps (rate limiting, Twilio call guard) —
   these are the only items here with real financial/security downside if
   ignored, and the demo is already public.
2. Fix the `currency` inconsistency and swap the placeholder phone number —
   both are five-minute fixes that remove landmines.
3. Add the reseed button + gate the Kokoro widget — removes the two ways
   the live pitch can visibly break in front of a prospect.
4. Add analytics — the single highest-leverage addition, and it should be
   in place *before* the next round of outreach so you're not flying blind
   on which prospects are engaging.
5. Everything else follows the natural pilot timeline in `plan.md` §6.
