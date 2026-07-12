import { ImageResponse } from "next/og";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { isLocale } from "@/lib/i18n/locales";

// Social share card (Open Graph + Twitter) — what LinkedIn/WhatsApp/Slack
// render when the demo link is pasted into a conversation. Generated at
// request time per locale; brand-matched to the "Obsidian Signal" theme.

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "LeadFlow AI";

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary(isLocale(locale) ? locale : "pl");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          backgroundColor: "#070709",
          backgroundImage: "radial-gradient(55% 55% at 78% 18%, rgba(255,106,31,0.22), transparent 65%)",
          color: "#f4f3f1",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #ff8a3d, #e8551a)",
              color: "#fff",
              fontSize: 36,
              fontWeight: 800,
            }}
          >
            L
          </div>
          <div style={{ fontSize: 40, fontWeight: 700 }}>LeadFlow AI</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1, maxWidth: 950 }}>
            {dict.meta.title.split("—")[1]?.trim() ?? dict.meta.title}
          </div>
          <div style={{ fontSize: 28, color: "#a3a1a8", maxWidth: 900, lineHeight: 1.4 }}>
            {dict.meta.description}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 22, color: "#ff8a3d" }}>
          <div style={{ width: 10, height: 10, borderRadius: 10, backgroundColor: "#ff8a3d" }} />
          {dict.hero.badge}
        </div>
      </div>
    ),
    size,
  );
}
