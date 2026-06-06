import { Router } from "express";
import { pool } from "../lib/db.js";

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
    { loc: `${baseUrl}/about`, changefreq: "monthly", priority: "0.6", lastmod: today },
    { loc: `${baseUrl}/contact`, changefreq: "monthly", priority: "0.6", lastmod: today },
    { loc: `${baseUrl}/cek-booking`, changefreq: "monthly", priority: "0.5", lastmod: today },
    { loc: `${baseUrl}/blog`, changefreq: "daily", priority: "0.7", lastmod: today },
    { loc: `${baseUrl}/departures`, changefreq: "weekly", priority: "0.7", lastmod: today },
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
  let blogEntries: UrlEntry[] = [];
  let landingPageEntries: UrlEntry[] = [];

  try {
    const client = await pool.connect();
    try {
      const { rows } = await client.query<{
        id: string;
        name: string;
        updated_at: string | null;
        package_type: string;
      }>(
        `SELECT id, name, updated_at, package_type
         FROM packages
         WHERE is_active = true
         ORDER BY updated_at DESC NULLS LAST`,
      );

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
    } finally {
      client.release();
    }
  } catch (err: any) {
    // Still serve static pages even if DB fails
    console.error("[Sitemap] DB error fetching packages:", err?.message);
  }

  try {
    const client = await pool.connect();
    try {
      const { rows } = await client.query<{
        id: string;
        slug: string;
        updated_at: string | null;
      }>(
        `SELECT id, slug, updated_at
         FROM blog_articles
         WHERE status = 'published'
         ORDER BY updated_at DESC NULLS LAST`,
      );

      blogEntries = rows.map((article) => ({
        loc: `${baseUrl}/blog/${article.slug}`,
        lastmod: toW3CDate(article.updated_at),
        changefreq: "weekly",
        priority: "0.8",
      }));
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("[Sitemap] DB error fetching blog articles:", err?.message);
  }

  try {
    const client = await pool.connect();
    try {
      const { rows } = await client.query<{
        id: string;
        slug: string;
        updated_at: string | null;
      }>(
        `SELECT id, slug, updated_at
         FROM landing_pages
         WHERE is_published = true
         ORDER BY updated_at DESC NULLS LAST`,
      );

      landingPageEntries = rows.map((lp) => ({
        loc: `${baseUrl}/lp/${lp.slug}`,
        lastmod: toW3CDate(lp.updated_at),
        changefreq: "monthly",
        priority: "0.7",
      }));
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("[Sitemap] DB error fetching landing pages:", err?.message);
  }

  const xml = buildSitemapXml(baseUrl, [...staticPages, ...packageEntries, ...blogEntries, ...landingPageEntries]);
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
