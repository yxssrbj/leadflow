# Agent templates: onboarding a new client/vertical

The three agents (speed-to-lead, quotation, outbound) are **not** hardcoded
to SolarTech Kraków. Every business-specific fact — company name, services,
pricing, the agents' names, appointment wording — lives in one config
record per client (a `BusinessConfig`). The prompt-building code is generic
and never changes when you onboard a new client.

Since the Supabase migration (`docs/tech-stack-roadmap.md` "Multi-tenant
config"), `BusinessConfig` records live in Postgres, not TypeScript files —
onboarding a new client is a form at `/admin/businesses/new`, not a code
change + deploy.

```
web/src/lib/agents/
├── types.ts              BusinessConfig, AgentPersona, Language
├── configs/
│   ├── solartech.ts       seed data + DB-unavailable fallback (PV/heat-pump installer)
│   ├── budmax-remont.ts   seed data + fallback for a second example vertical
│   ├── store.ts           the real DB-backed getBusinessConfig/list/upsert/delete
│   └── index.ts           thin re-export — the stable public API
├── prompts/
│   ├── shared.ts           openingLine/languageRule helpers reused by all three
│   ├── speedToLead.ts       Ola's system prompt builder
│   ├── quotation.ts         Kuba's system prompt builder
│   └── outbound.ts          Marek's system prompt builder
└── tools.ts               shared book_appointment/generate_quote/close_lead schemas

web/src/lib/schema.ts       Drizzle table definition for business_configs
web/src/app/[locale]/admin/ the create/edit screen (PIN-gated, see ADMIN_PIN)
```

## Onboarding a new client (no code, no deploy)

1. Set `ADMIN_PIN` in `web/.env.local` if you haven't already (see
   `.env.local.example`), and make sure `DATABASE_URL` points at your
   Supabase project.
2. Go to `/pl/admin/businesses/new` (or `/en/...`), enter the PIN once, and
   fill in the form — see the field reference below for what each one does.
3. Save. The new business is live immediately (a short in-memory cache means
   up to ~30s before every server instance picks it up — see `store.ts`).
4. Demo it at `/demo?business=<your-client-id>`, or pass
   `businessId: "<your-client-id>"` in the request body from any
   integration (defaults to `solartech` if omitted).

That's it — the same Ola/Kuba/Marek prompt logic, tool schemas, and route
handlers now run for the new business, with zero prompt-string edits.
`budmax-remont` (a renovation contractor, seeded via `npm run db:seed`)
exists specifically to prove this: it reuses every line of prompt-building
code and only changes the config data.

**Local dev without Supabase set up yet:** `getBusinessConfig()` falls back
to the hardcoded `solartech`/`budmax-remont` objects in `configs/*.ts` if
`DATABASE_URL` is unset or the DB is unreachable, so the demo and its two
example verticals keep working out of the box. The admin screen itself
requires a real DB (there's nowhere else to write a new record to).

## `BusinessConfig` field reference

| Field | What it controls | Needs both `pl`/`en`? |
|---|---|---|
| `businessName`, `city` | Company identity used in every prompt's opening line | No — used as-is in both languages |
| `vertical` | One-line English description of the business type | No — meta-instruction, English only |
| `agents.{speedToLead,quotation,outbound}.name` | The persona's name (e.g. "Ola") | No |
| `agents.*.role` | English descriptor (e.g. "intake agent") | No — never shown to the lead |
| `services` | What the business offers, in the prompt intro | No — meta-instruction |
| `appointmentLabel` | What the booked visit is called (include the local term in parens, e.g. `"free on-site audit (bezpłatny audyt)"`) | No |
| `qualifyingQuestions` | The intake questions Ola/Iga asks, in order | No — meta-instruction |
| `pricingGuide` | The quotation agent's pricing rules | **Yes** — this text is copied close to verbatim into the quote's line-item text, so it must already be in the reply language |
| `subsidyNote` | Local incentive programs to mention (empty string = skip) | No — meta-instruction |
| `model` | Per-agent `model`/`maxTokens` overrides | — |

Why most fields are English-only: every prompt is a set of **instructions
to Claude**, written in English regardless of which language the agent will
reply in — a single `languageRule(language)` clause ("write ONLY in natural
Polish" / "...English") controls the actual reply language. The one
exception is `pricingGuide`, because those sentences aren't instructions —
they're example output text the model copies straight into its
`generate_quote` tool call, so they need to already be correct in both
languages.

## Changing parameters (tuning an existing agent)

Everything you'd want to tune lives in one of two places:

- **Business facts / tone / pricing** → edit via `/admin/businesses/<id>`
  for a real client, or the relevant `configs/*.ts` for the seed/fallback
  data itself. Changing `qualifyingQuestions` or `pricingGuide` changes
  what the agent asks and quotes without touching any prompt-building code.
- **Model behavior** → the `model` field isn't in the admin form yet (an
  advanced, rarely-touched setting) — edit it directly via
  `upsertBusinessConfig()` (`lib/agents/configs/store.ts`) or a one-off
  script, or fall back to the shared default in `lib/anthropic.ts`'s
  `MODEL` constant. Temperature isn't currently set (Claude's default); add
  it to `BusinessConfig.model` and thread it through a prompt builder's
  `client.messages.create` call if you need per-client control.
- **Tool schemas** (what fields the model must return) → `tools.ts`.
- **Register/wording rules that apply to every business** (e.g. "1-3
  sentences max", "never invent a time outside the offered list") → the
  prompt builders in `prompts/*.ts`. These are the actual behavioral rules,
  not business facts, so they intentionally live in code, not config.

## "Training" the agents

These are **prompt-engineered Claude agents, not fine-tuned models** — there
is no training run, weights, or dataset. "Training" an agent in this system
means:

1. **Iterate the config.** Adjust `qualifyingQuestions`, `pricingGuide`
   wording, or `subsidyNote` to match how the real business actually talks
   and prices jobs.
2. **Test for free with the mock provider.** Set `AGENT_PROVIDER=mock` in
   `web/.env.local` (the default until you add an API key) — the full
   chat → tool-call → dashboard flow runs end to end with scripted replies,
   so you can validate the plumbing and UI before spending anything.
3. **Validate conversation quality with real Claude.** Switch to
   `AGENT_PROVIDER=anthropic` (or `vertex`) once you have a key, run the same
   conversations, and read the actual replies for tone, accuracy, and
   whether it asks the right qualifying questions before quoting/booking.
4. **Tighten the prompt rules if needed.** If the model asks too many
   questions, quotes too low, or breaks character, that's a rule to add or
   sharpen in `prompts/*.ts` (if it's a general behavior) or a fact to fix in
   `configs/*.ts` (if it's specific to that business).

If you later want few-shot examples (showing the model 2-3 ideal exchanges
instead of just describing the rules), add them as an `examples` field on
`BusinessConfig` and splice them into the prompt in `prompts/shared.ts` —
the structure supports this without any other changes.
