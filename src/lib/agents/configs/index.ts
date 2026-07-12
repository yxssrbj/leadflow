// Public API for looking up BusinessConfig records. As of the Supabase
// migration (docs/tech-stack-roadmap.md "Multi-tenant config"), these are
// DB-backed (see store.ts) instead of an in-memory REGISTRY — onboarding a
// new client is now a row created via /admin/businesses/new, not a new
// TypeScript file. See docs/agent-templates.md.
//
// All three lookup functions are now async (they were sync before); every
// call site already lives in an async function, so this only ever required
// adding `await`.
//
// DEFAULT_BUSINESS_ID is re-exported from ./constants specifically (not
// ./store) so Client Components can import it without pulling the Postgres
// driver into the browser bundle — see the comment in constants.ts.
export {
  getBusinessConfig,
  isBusinessId,
  listBusinessConfigs,
  upsertBusinessConfig,
  deleteBusinessConfig,
} from "./store";
export { DEFAULT_BUSINESS_ID } from "./constants";
