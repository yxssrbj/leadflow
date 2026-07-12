import { solartech } from "./solartech";

// Split out from store.ts on purpose: this file must have zero
// Node/DB-only dependencies (solartech.ts itself only has a type-only
// import, which is erased at build time) so Client Components can import
// DEFAULT_BUSINESS_ID directly without dragging the Postgres client into
// the browser bundle — that broke `next build` the first time this
// constant lived inside store.ts (an ES module's whole top-level runs,
// including its `postgres` import, even to reach one unused export).
export const DEFAULT_BUSINESS_ID = solartech.id;
