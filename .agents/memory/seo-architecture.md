---
name: SEO Architecture
description: Pattern SEO meta injection di Vinstour — hook useSEO, PackageDetail manual useEffect, departures DB fields, sitemap sudah ada.
---

## Pola SEO

### `useSEO` hook
- File: `artifacts/umrah-haji/src/hooks/useSEO.ts`
- Untuk halaman list/statis — inject title, meta desc, OG, canonical, JSON-LD, cleanup on unmount
- Menerima `SEOOptions` — title, description, keywords, canonicalPath, ogType, ogImage, siteName, jsonLd, schemaId

### PackageDetail — manual useEffect
- PackageDetail TIDAK pakai `useSEO` hook karena punya logic cleanup spesifik (restore siteTitle, remove canonical)
- Inject sendiri di `useEffect` dengan `data-schema="package-detail"` pada JSON-LD script
- JSON-LD pakai `@graph` dengan 3 schema sekaligus: Product + TouristTrip + BreadcrumbList
- `siteTitle` harus dari `settings?.company_name || "Vinstour Travel"` — JANGAN hardcode

### og:image fallback chain (PackageDetail)
`pkg.featured_image || settings?.og_image_url || null`

### DB SEO fields
- `packages`: meta_title, meta_description, keywords (TEXT[]) — via migration 13
- `departures`: meta_title, meta_description, slug — via migration 14

### Sitemap
- Sudah ada di `artifacts/api-server/src/routes/sitemap.ts`
- Generate packages aktif + blog + landing pages + static pages
- Endpoint: `GET /sitemap.xml` dan `GET /robots.txt`

**Why:** Setiap halaman butuh SEO berbeda; PackageDetail perlu cleanup yang lebih complex dari hook generic.

**How to apply:** Halaman list/statis pakai `useSEO`. Halaman detail dengan cleanup complex pakai manual useEffect. Selalu ambil siteTitle dari `settings.company_name`.
