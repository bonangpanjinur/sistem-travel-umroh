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

// ─── GET /api/manifest/export/:departureId — Server-side jamaah manifest CSV ──
// P2: Server-side export hindari crash browser saat download besar

router.get("/manifest/export/:departureId", async (req, res) => {
  const { departureId } = req.params;
  const format = (req.query.format as string) || "csv";

  if (!departureId) {
    res.status(400).json({ error: "departureId wajib diisi" });
    return;
  }

  try {
    const { pool } = await import("../lib/db.js");
    const client = await pool.connect();
    let passengers: any[];
    try {
      const { rows } = await client.query(
        `SELECT bp.id, bp.full_name, bp.gender, bp.birth_date, bp.nationality,
                bp.passport_number, bp.passport_expiry, bp.phone, bp.email,
                bp.passenger_type, bp.seat_number, bp.room_preference,
                bp.special_requests, bp.is_main_passenger, bp.booking_id,
                b.booking_code, b.status, b.room_number,
                c.full_name AS customer_name, c.phone AS customer_phone, c.email AS customer_email
         FROM booking_passengers bp
         INNER JOIN bookings b ON b.id = bp.booking_id
         LEFT JOIN customers c ON c.id = b.customer_id
         WHERE b.departure_id = $1 AND b.status != 'cancelled'
         ORDER BY bp.full_name`,
        [departureId]
      );
      passengers = rows.map(row => ({
        ...row,
        bookings: {
          booking_code: row.booking_code,
          status: row.status,
          room_number: row.room_number,
          customers: { full_name: row.customer_name, phone: row.customer_phone, email: row.customer_email },
        },
      }));
    } finally {
      client.release();
    }

    if (format === "csv") {
      const headers = [
        "No", "Nama Lengkap", "Gender", "Tgl Lahir", "Kewarganegaraan",
        "No Paspor", "Exp Paspor", "Telepon", "Email",
        "Tipe Penumpang", "Nomor Kursi", "Tipe Kamar", "Kode Booking", "Status Booking", "Nomor Kamar",
      ];

      const rows = passengers.map((p: any, idx: number) => [
        idx + 1,
        p.full_name || "",
        p.gender || "",
        p.birth_date || "",
        p.nationality || "",
        p.passport_number || "",
        p.passport_expiry || "",
        p.phone || p.bookings?.customers?.phone || "",
        p.email || p.bookings?.customers?.email || "",
        p.passenger_type || "adult",
        p.seat_number || "",
        p.room_preference || "",
        p.bookings?.booking_code || "",
        p.bookings?.status || "",
        p.bookings?.room_number || "",
      ]);

      const csvLines = [headers, ...rows].map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      );
      const csv = "\uFEFF" + csvLines.join("\r\n"); // BOM for Excel

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="manifest-jamaah-${departureId}.csv"`);
      res.setHeader("Cache-Control", "no-store");
      res.send(csv);
    } else {
      // JSON fallback
      res.json({ count: passengers.length, passengers });
    }
  } catch (err: any) {
    console.error("[Manifest Export] Error:", err.message);
    res.status(500).json({ error: "Gagal generate manifest", detail: err.message });
  }
});

export default router;
