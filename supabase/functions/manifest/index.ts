// Public dynamic Web App Manifest — reflects website_settings live (GAP-PWA-01).
// Served at: https://<project-ref>.supabase.co/functions/v1/manifest
// Linked from index.html as <link rel="manifest" href="…/functions/v1/manifest" />.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/manifest+json; charset=utf-8",
  "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
};

interface PWAIconConfig {
  iconUrl?: string | null;
  appName?: string;
  shortName?: string;
  themeColor?: string;
  bgColor?: string;
}

function buildManifest(s: any | null) {
  const cs = (s?.custom_sections && typeof s.custom_sections === "object" && !Array.isArray(s.custom_sections))
    ? s.custom_sections : {};
  const pwa: PWAIconConfig = (cs?.pwa_icon_config ?? {}) as PWAIconConfig;

  const appName = pwa.appName || s?.company_name || "Vinstour Travel";
  const shortName = pwa.shortName || (s?.company_name ? String(s.company_name).split(" ")[0] : null) || "Vinstour";
  const primaryHsl = s?.primary_color ? `hsl(${s.primary_color})` : null;
  const themeColor = pwa.themeColor || primaryHsl || "#15803d";
  const bgColor = pwa.bgColor || "#0f2518";
  const description = s?.tagline ? `${appName} — ${s.tagline}` : "Platform manajemen Umroh & Haji digital.";

  const icons: Array<Record<string, string>> = [];
  if (pwa.iconUrl && pwa.iconUrl.startsWith("http")) {
    icons.push(
      { src: pwa.iconUrl, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: pwa.iconUrl, sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: pwa.iconUrl, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: pwa.iconUrl, sizes: "512x512", type: "image/png", purpose: "maskable" },
    );
  }
  if (s?.logo_url && s.logo_url.startsWith("http") && s.logo_url !== pwa.iconUrl) {
    icons.push({ src: s.logo_url, sizes: "192x192", type: "image/png", purpose: "any" });
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
    categories: ["travel", "lifestyle"],
    shortcuts: [
      { name: "Portal Jamaah", short_name: "Portal", url: "/jamaah", icons: [{ src: "/images/icon-192.png", sizes: "192x192" }] },
      { name: "Waktu Sholat", short_name: "Sholat", url: "/sholat", icons: [{ src: "/images/icon-192.png", sizes: "192x192" }] },
      { name: "Panduan Ibadah", short_name: "Panduan", url: "/jamaah/panduan-ibadah", icons: [{ src: "/images/icon-192.png", sizes: "192x192" }] },
      { name: "Cek Booking", short_name: "Booking", url: "/cek-booking", icons: [{ src: "/images/icon-192.png", sizes: "192x192" }] },
    ],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data } = await supabase
      .from("website_settings")
      .select("company_name, tagline, primary_color, logo_url, custom_sections")
      .is("agent_id", null)
      .is("branch_id", null)
      .limit(1)
      .maybeSingle();
    return new Response(JSON.stringify(buildManifest(data)), { headers: corsHeaders });
  } catch {
    return new Response(JSON.stringify(buildManifest(null)), { headers: corsHeaders });
  }
});