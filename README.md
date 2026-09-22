# LeadFlow AI

AI-assisted lead follow-up, appointment booking, and quotations for home-service businesses.

I built LeadFlow to explore how a business could handle a new enquiry, collect the right details, and turn the conversation into a booked appointment, a quote, or an updated customer record. It brings those workflows into a Polish/English web app with a client dashboard.

**Website:** deployed on Vercel. **Live demo URL:** `LIVE_DEMO_URL_HERE` (placeholder).

## What it does

- **Lead intake and booking:** collects customer requirements and saves appointments through structured tool calls.
- **Quotations:** gathers job details and produces quotes with line items stored in the CRM.
- **Lead re-engagement:** provides a conversation workflow for following up with existing leads and recording the outcome.
- **Client dashboard:** authenticated access to a business's leads, appointments, and quotes.
- **Configurable businesses:** business-specific services, prompts, and settings, with a PIN-gated administration screen.
- **Polish and English:** localized pages and conversation flows under `/pl` and `/en`.
- **Voice and SMS:** browser speech, Twilio calls and two-way SMS, and a custom real-time voice bridge. Availability depends on deployment and credentials.

## Try the demo

1. Open `/en/demo` or `/pl/demo` on the deployed website.
2. Choose a business and try the lead-intake, quotation, or follow-up workflow.
3. Complete a conversation to see how collected details become an action.
4. With a provisioned account, open `/en/login` or `/pl/login` to view the corresponding business dashboard.

Mock mode uses scripted replies. Live AI responses require a configured provider. Real calls and SMS also require Twilio configuration and a demo PIN; deployment of the website does not mean every integration is enabled.

## Built with

| Area | Technology |
| --- | --- |
| Web app and API routes | Next.js 16, React 19, TypeScript |
| Styling and animation | Tailwind CSS 4, GSAP |
| CRM and business configuration | PostgreSQL / Supabase, Drizzle ORM |
| Dashboard authentication | Supabase Auth |
| Agent providers | OpenAI, Anthropic, or Anthropic through Google Vertex AI; mock mode for development |
| Voice and messaging | Twilio, OpenAI speech integrations, WebSockets |
| Checks | Vitest, ESLint, TypeScript |
| Website hosting | Vercel |

## How it works

The Next.js app serves the demo, dashboard, and API routes. Agent routes combine business configuration with conversation history, then use structured tool results to save leads, appointments, or quotes in PostgreSQL. Dashboard access resolves a business from the authenticated user's ownership record.

The real-time phone integration has an additional runtime: `server.ts` accepts WebSocket upgrades and connects Twilio audio streams to the voice provider through `src/lib/realtimeVoice.ts`.

## Run locally

Run these commands from the directory containing `package.json`, using a Node.js version compatible with the installed Next.js release.

### 1. Install dependencies

```bash
npm ci
```

### 2. Configure the environment

Create `.env.local` with your own values for the database-backed demo and dashboard:

```dotenv
AGENT_PROVIDER=mock
DATABASE_URL=YOUR_POSTGRES_RUNTIME_CONNECTION_STRING
DATABASE_MIGRATION_URL=YOUR_POSTGRES_MIGRATION_CONNECTION_STRING
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
# Used by the demo-account seed script, never browser code:
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

Use the Supabase transaction-pooler connection for runtime queries and a session-pooler or direct connection for migrations. Migration configuration falls back to `DATABASE_URL` when no migration URL is set.

Mock mode avoids AI-provider credentials, but the CRM-backed demo still needs PostgreSQL. Business-configuration fallback data does not replace the CRM database.

For live responses, select `openai`, `anthropic`, or `vertex` through `AGENT_PROVIDER` and configure the corresponding credentials. See [the environment example](.env.local.example) for available variables and use your own values. Keep secrets in local environment files or hosting settings.

### 3. Prepare a development database

```bash
npm run db:migrate
npm run db:seed
```

The seed command loads example businesses and CRM records, creates demo authentication accounts, and links them to their businesses. Use a development database. Newly generated account passwords are printed by the seed script; retain them privately.

### 4. Start the app

```bash
npm run dev
```

Open [localhost:3000/en](http://localhost:3000/en) or [localhost:3000/pl](http://localhost:3000/pl). The development command starts the custom Next.js server, including its WebSocket upgrade handler.

## Deployment and integration notes

The website is deployed on Vercel; the public URL will replace the placeholder above. Configure the appropriate database, authentication, and provider environment variables in the hosting environment. `NEXT_PUBLIC_SITE_URL` supplies the public origin for site metadata.

The real-time voice bridge lives in the custom Node server. Treat its hosting and connection setup as a separate integration requirement, and verify a complete call before advertising it as available in the hosted demo.

For local phone/SMS testing, configure the Twilio variables, `VOICE_DEMO_PIN`, and a public HTTPS origin in `PUBLIC_BASE_URL`. Incoming SMS uses `/api/sms/inbound`. Calls and SMS are disabled without the demo PIN configuration.

Current implementation boundaries:

- Rate-limit counters and call/SMS sessions use process memory. They are not shared across instances or preserved across restarts.
- Analytics uses a local JSON file, separate from the PostgreSQL CRM. Reliable storage across hosted instances needs a durable shared store.
- Dashboard access uses business ownership checks. The project is a demo application, not a fully audited production CRM.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local app and custom voice server |
| `npm run build` | Build the Next.js app |
| `npm run typecheck` | Check TypeScript types |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest suite |
| `npm run db:generate` | Generate migrations after schema changes |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:seed` | Populate development data and provision demo accounts |
| `npm run db:studio` | Inspect the database with Drizzle Studio |

## Finding your way around

| Location | Contents |
| --- | --- |
| `src/app/[locale]/` | Localized website, demo, login, dashboard, and admin pages |
| `src/app/api/` | Agent, voice, SMS, lead, and analytics endpoints |
| `src/lib/agents/` | Business configurations, prompt builders, and agent tools |
| `src/lib/crm.ts` and `src/lib/schema.ts` | CRM operations and database schema |
| `src/lib/auth.ts` | Authenticated user-to-business lookup |
| `src/lib/realtimeVoice.ts` and `server.ts` | Real-time phone audio bridge and its server |
| `drizzle/` | Database migrations |
| `scripts/` | Development data and account setup |

Further reading: [code structure](docs/code-structure.md), [architecture](docs/architecture.md), and [agent templates](docs/agent-templates.md). Older planning and handoff documents describe earlier stages; check the current implementation when using them.
