import { notFound } from "next/navigation";

// Catch-all for any URL under a locale that matches no real route — routes
// the request into [locale]/not-found.tsx so bad links get the branded 404
// (inside the localized Nav/Footer) instead of Next's default page.
export default function CatchAll(): never {
  notFound();
}
