import { Router } from "express";
import { db } from "../lib/db.js";
import { websiteSettings } from "@workspace/db/schema";
import { and, isNull } from "drizzle-orm";

const router = Router();

interface PWAIconConfig {
  iconUrl?: string | null;
  appName?: string;
  shortName?: string;
  themeColor?: string;
  bgColor?: string;
}

interface WebsiteSettingsRow {
  company_name?: string | null;
  tagline?: string | null;
  primary_color?: string | null;
  logo_url?: string | null;
  custom_sections?: unknown;
}

function getCustomData(raw: unknown): Record<string, unknown> {
  if (!raw || Array.isArray(raw)) return {};
  if (typeof raw === "object") return raw as Record<string, unknown>;
  return {};
}

function buildManifest(settings: WebsiteSettingsRow | null) {
  const customData = getCustomData(settings?.custom_sections);
  const iconCfg = (customData?.pwa_icon_config ?? {}) as PWAIconConfig;

  const appName = iconCfg.appName || settings?.company_name || "Vinstour Travel";
  const shortName =
    iconCfg.shortName ||
    (settings?.company_name ? settings.company_name.split(" ")[0] : null) ||
    "Vinstour";
  const themeColor = iconCfg.themeColor || settings?.primary_color || "#15803d";
  const bgColor = iconCfg.bgColor || settings?.primary_color || "#0f2518";
  const description = settings?.tagline
    ? `${appName} — ${settings.tagline}`
    : "Platform manajemen Umroh & Haji digital. Pantau perjalanan ibadah, dokumen, itinerary, dan panduan ibadah.";

  const icons: Array<{ src: string; sizes: string; type: string; purpose?: string }> = [];

  if (iconCfg.iconUrl && iconCfg.iconUrl.startsWith("http")) {
    icons.push(
      { src: iconCfg.iconUrl, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: iconCfg.iconUrl, sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: iconCfg.iconUrl, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: iconCfg.iconUrl, sizes: "512x512", type: "image/png", purpose: "maskable" },
    );
  }

  if (settings?.logo_url && settings.logo_url.startsWith("http") && settings.logo_url !== iconCfg.iconUrl) {
    icons.push({ src: settings.logo_url, sizes: "192x192", type: "image/png", purpose: "any" });
  }

  icons.push(
    { src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
    { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
    { src: "/images/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/images/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    { src: "/images/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/images/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  );

  return {
    name: `${appName} — Umroh & Haji`,
    short_name: shortName,
    description,
    start_url: "/jamaah",
    scope: "/",
    display: "standalone",
    background_color: bgColor,
    theme_color: themeColor,
    orientation: "portrait-primary",
    lang: "id",
    icons,
    screenshots: [
      { src: "/opengraph.jpg", sizes: "1200x630", type: "image/jpeg", form_factor: "wide", label: appName },
    ],
    categories: ["travel", "lifestyle"],
    shortcuts: [
      { name: "Portal Jamaah", short_name: "Portal", description: "Buka portal jamaah Anda", url: "/jamaah", icons: [{ src: "/images/icon-192.png", sizes: "192x192" }] },
      { name: "Waktu Sholat", short_name: "Sholat", description: "Cek jadwal waktu sholat", url: "/sholat", icons: [{ src: "/images/icon-192.png", sizes: "192x192" }] },
      { name: "Panduan Ibadah", short_name: "Panduan", description: "Panduan doa dan ibadah umroh", url: "/jamaah/panduan-ibadah", icons: [{ src: "/images/icon-192.png", sizes: "192x192" }] },
      { name: "Cek Status Booking", short_name: "Booking", description: "Cek status booking perjalanan", url: "/cek-booking", icons: [{ src: "/images/icon-192.png", sizes: "192x192" }] },
    ],
  };
}

router.get("/manifest.json", async (_req, res) => {
  res.setHeader("Content-Type", "application/manifest+json");
  res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");

  try {
    const rows = await db
      .select({
        company_name: websiteSettings.companyName,
        tagline: websiteSettings.tagline,
        primary_color: websiteSettings.primaryColor,
        logo_url: websiteSettings.logoUrl,
        custom_sections: websiteSettings.customSections,
      })
      .from(websiteSettings)
      .where(and(isNull(websiteSettings.agentId), isNull(websiteSettings.branchId)))
      .limit(1);

    const settings = rows.length > 0 ? rows[0] : null;
    return res.json(buildManifest(settings));
  } catch {
    return res.json(buildManifest(null));
  }
});

export default router;
