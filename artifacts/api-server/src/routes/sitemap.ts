import { Router } from "express";

const router = Router();

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toW3CDate(date: Date | string | null): string {
  if (!date) return new Date().toISOString().split("T")[0];
  return new Date(date).toISOString().split("T")[0];
}

interface UrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

function buildSitemapXml(baseUrl: string, entries: UrlEntry[]): string {
  const urls = entries
    .map(
      (e) => `  <url>
    <loc>${escapeXml(e.loc)}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ""}${e.changefreq ? `\n    <changefreq>${e.changefreq}</changefreq>` : ""}${e.priority ? `\n    <priority>${e.priority}</priority>` : ""}
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
          http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls}
</urlset>`;
}

// ── Supabase REST API helper ──────────────────────────────────────────────────
function getSupabaseClient() {
  const url = process.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"];
  const key =
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["VITE_SUPABASE_ANON_KEY"] ||
    process.env["SUPABASE_ANON_KEY"] ||
    process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key || url.includes("placeholder")) return null;
  return { url, key };
}

async function supabaseGet<T = any>(
  table: string,
  params: Record<string, string>,
): Promise<T[]> {
  const sb = getSupabaseClient();
  if (!sb) return [];
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${sb.url}/rest/v1/${table}?${qs}`, {
    headers: {
      apikey: sb.key,
      Authorization: `Bearer ${sb.key}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Supabase ${table} HTTP ${res.status}`);
  return res.json() as Promise<T[]>;
}

// ── DB pool (Neon / pg) — optional, used only if DATABASE_URL is set ──────────
async function tryPool<T>(
  fn: () => Promise<T>,
): Promise<T | null> {
  if (!process.env["DATABASE_URL"]) return null;
  try {
    const { pool } = await import("../lib/db.js");
    return await fn.call(null, pool);
  } catch {
    return null;
  }
}

router.get("/sitemap.xml", async (req, res) => {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");

  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:5000";
  const baseUrl = `${proto}://${host}`;

  const today = new Date().toISOString().split("T")[0];

  const staticPages: UrlEntry[] = [
    { loc: `${baseUrl}/`, changefreq: "daily", priority: "1.0", lastmod: today },
    { loc: `${baseUrl}/packages`, changefreq: "daily", priority: "0.9", lastmod: today },
    { loc: `${baseUrl}/departures`, changefreq: "weekly", priority: "0.7", lastmod: today },
    { loc: `${baseUrl}/about`, changefreq: "monthly", priority: "0.6", lastmod: today },
    { loc: `${baseUrl}/contact`, changefreq: "monthly", priority: "0.6", lastmod: today },
    { loc: `${baseUrl}/cek-booking`, changefreq: "monthly", priority: "0.5", lastmod: today },
    { loc: `${baseUrl}/blog`, changefreq: "daily", priority: "0.7", lastmod: today },
    { loc: `${baseUrl}/testimonials`, changefreq: "monthly", priority: "0.5", lastmod: today },
    { loc: `${baseUrl}/fitur`, changefreq: "monthly", priority: "0.5", lastmod: today },
    { loc: `${baseUrl}/kurs`, changefreq: "monthly", priority: "0.5", lastmod: today },
    { loc: `${baseUrl}/jamaah-info`, changefreq: "monthly", priority: "0.5", lastmod: today },
    { loc: `${baseUrl}/sholat`, changefreq: "monthly", priority: "0.5", lastmod: today },
    { loc: `${baseUrl}/alquran`, changefreq: "monthly", priority: "0.5", lastmod: today },
    { loc: `${baseUrl}/kiblat`, changefreq: "monthly", priority: "0.5", lastmod: today },
    { loc: `${baseUrl}/cuaca`, changefreq: "monthly", priority: "0.5", lastmod: today },
    { loc: `${baseUrl}/tracker-ibadah`, changefreq: "monthly", priority: "0.5", lastmod: today },
    { loc: `${baseUrl}/kalkulator-islami`, changefreq: "monthly", priority: "0.5", lastmod: today },
    { loc: `${baseUrl}/tasbih`, changefreq: "monthly", priority: "0.5", lastmod: today },
    { loc: `${baseUrl}/panduan-manasik`, changefreq: "monthly", priority: "0.5", lastmod: today },
  ];

  let packageEntries: UrlEntry[] = [];
  let departureEntries: UrlEntry[] = [];
  let blogEntries: UrlEntry[] = [];
  let landingPageEntries: UrlEntry[] = [];

  // ── Packages ───────────────────────────────────────────────────────────────
  try {
    // 1. Try Supabase REST API (primary — this is a Supabase project)
    const rows = await supabaseGet<{
      id: string;
      name: string;
      updated_at: string | null;
      package_type: string;
    }>("packages", {
      select: "id,name,updated_at,package_type",
      is_active: "eq.true",
      order: "updated_at.desc.nullslast",
    });

    packageEntries = rows.map((pkg) => {
      const slug = `${pkg.id}-${slugify(pkg.name)}`;
      const priority =
        pkg.package_type === "umroh" ? "0.85"
        : pkg.package_type === "haji" ? "0.80"
        : "0.75";
      return {
        loc: `${baseUrl}/packages/${slug}`,
        lastmod: toW3CDate(pkg.updated_at),
        changefreq: "weekly",
        priority,
      };
    });
  } catch (sbErr: any) {
    console.warn("[Sitemap] Supabase packages failed, trying pool:", sbErr?.message);
    // 2. Fallback: Neon/pg pool
    const result = await tryPool(async (pool: any) => {
      const client = await pool.connect();
      try {
        const { rows } = await client.query<{
          id: string; name: string; updated_at: string | null; package_type: string;
        }>(
          `SELECT id, name, updated_at, package_type FROM packages WHERE is_active = true ORDER BY updated_at DESC NULLS LAST`,
        );
        return rows;
      } finally {
        client.release();
      }
    });
    if (result) {
      packageEntries = result.map((pkg: any) => ({
        loc: `${baseUrl}/packages/${pkg.id}-${slugify(pkg.name)}`,
        lastmod: toW3CDate(pkg.updated_at),
        changefreq: "weekly",
        priority: pkg.package_type === "umroh" ? "0.85" : pkg.package_type === "haji" ? "0.80" : "0.75",
      }));
    } else {
      console.error("[Sitemap] All package fetch methods failed");
    }
  }

  // ── Departures ─────────────────────────────────────────────────────────────
  try {
    const rows = await supabaseGet<{
      id: string;
      slug: string | null;
      departure_date: string | null;
      updated_at: string | null;
      package: { name: string } | null;
    }>("departures", {
      select: "id,slug,departure_date,updated_at,package:packages(name)",
      status: "eq.open",
      order: "departure_date.asc.nullslast",
    });
    departureEntries = rows
      .filter((d) => {
        if (!d.departure_date) return false;
        return new Date(d.departure_date) >= new Date(Date.now() - 86400000);
      })
      .map((d) => {
        const depSlug =
          d.slug ||
          `${d.id}-${slugify((d.package as any)?.name || "keberangkatan")}`;
        return {
          loc: `${baseUrl}/departures/${depSlug}`,
          lastmod: toW3CDate(d.updated_at),
          changefreq: "weekly",
          priority: "0.75",
        };
      });
  } catch {
    const result = await tryPool(async (pool: any) => {
      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          `SELECT d.id, d.slug, d.departure_date, d.updated_at, p.name AS package_name
           FROM departures d
           LEFT JOIN packages p ON p.id = d.package_id
           WHERE d.status = 'open' AND d.departure_date >= CURRENT_DATE - 1
           ORDER BY d.departure_date ASC`,
        );
        return rows;
      } finally { client.release(); }
    });
    if (result) {
      departureEntries = result.map((d: any) => {
        const depSlug = d.slug || `${d.id}-${slugify(d.package_name || "keberangkatan")}`;
        return {
          loc: `${baseUrl}/departures/${depSlug}`,
          lastmod: toW3CDate(d.updated_at),
          changefreq: "weekly",
          priority: "0.75",
        };
      });
    }
  }

  // ── Blog Articles ──────────────────────────────────────────────────────────
  try {
    const rows = await supabaseGet<{
      id: string; slug: string; updated_at: string | null;
    }>("blog_articles", {
      select: "id,slug,updated_at",
      status: "eq.published",
      order: "updated_at.desc.nullslast",
    });
    blogEntries = rows.map((a) => ({
      loc: `${baseUrl}/blog/${a.slug}`,
      lastmod: toW3CDate(a.updated_at),
      changefreq: "weekly",
      priority: "0.8",
    }));
  } catch {
    const result = await tryPool(async (pool: any) => {
      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          `SELECT id, slug, updated_at FROM blog_articles WHERE status = 'published' ORDER BY updated_at DESC NULLS LAST`,
        );
        return rows;
      } finally { client.release(); }
    });
    if (result) {
      blogEntries = result.map((a: any) => ({
        loc: `${baseUrl}/blog/${a.slug}`,
        lastmod: toW3CDate(a.updated_at),
        changefreq: "weekly",
        priority: "0.8",
      }));
    }
  }

  // ── Landing Pages ──────────────────────────────────────────────────────────
  try {
    const rows = await supabaseGet<{
      id: string; slug: string; updated_at: string | null;
    }>("landing_pages", {
      select: "id,slug,updated_at",
      is_published: "eq.true",
      order: "updated_at.desc.nullslast",
    });
    landingPageEntries = rows.map((lp) => ({
      loc: `${baseUrl}/lp/${lp.slug}`,
      lastmod: toW3CDate(lp.updated_at),
      changefreq: "monthly",
      priority: "0.7",
    }));
  } catch {
    const result = await tryPool(async (pool: any) => {
      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          `SELECT id, slug, updated_at FROM landing_pages WHERE is_published = true ORDER BY updated_at DESC NULLS LAST`,
        );
        return rows;
      } finally { client.release(); }
    });
    if (result) {
      landingPageEntries = result.map((lp: any) => ({
        loc: `${baseUrl}/lp/${lp.slug}`,
        lastmod: toW3CDate(lp.updated_at),
        changefreq: "monthly",
        priority: "0.7",
      }));
    }
  }

  const xml = buildSitemapXml(baseUrl, [
    ...staticPages,
    ...packageEntries,
    ...departureEntries,
    ...blogEntries,
    ...landingPageEntries,
  ]);
  res.send(xml);
});

// robots.txt — allow crawlers, point to sitemap
router.get("/robots.txt", (req, res) => {
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:5000";
  const baseUrl = `${proto}://${host}`;

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(
    `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nDisallow: /auth/\n\nSitemap: ${baseUrl}/sitemap.xml\n`,
  );
});

export default router;
