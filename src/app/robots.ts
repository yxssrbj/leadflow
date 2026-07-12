import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep crawlers out of the API and the per-prospect surfaces.
      disallow: ["/api/", "/pl/dashboard", "/en/dashboard"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
