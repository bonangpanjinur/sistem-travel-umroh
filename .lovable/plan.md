# Roadmap Vinstour Travel

## Status Fase Keseluruhan

| Fase | Judul | Status |
|---|---|---|
| 1 | Audit & dokumen perbaikan | ✅ Selesai |
| 2 | Bug kritis & RBAC hardening (B1/B3/B4, agen C1/C2) | ✅ Selesai |
| 3 | UI/UX jamaah refresh + bottom nav modern | ✅ Selesai |
| 4 | Dual experience (PWA standalone gate + dynamic appearance) | ✅ Selesai |
| 5 | Modul Ibadah (Kiblat, Quran, Zikir, Doa, Manasik, Tracker, Pengingat) | ✅ Selesai |
| 6 | Storefront Toko Jamaah | ✅ Selesai |
| 7 | PWA App Layout Configurator (admin) | ✅ Selesai |
| 8 | Push Notification Infrastructure + auto triggers + admin outbox | ✅ Selesai |
| 8.x | Build fix Vercel (schema sync `customer_mahrams` / `store_product_reviews` / district / village + type cast) | ✅ Selesai |
| **9** | **Polish & Hardening** | **🟡 ~75%** |

---

## ✅ Sudah Selesai (ringkas per fase)

- **Fase 1** — Dokumen audit `docs/AUDIT_DAN_RENCANA_PERBAIKAN.md`.
- **Fase 2** — Multi-tenant scoping, role permissions, agent hierarchy AGT/SUB, server-side booking code RPC.
- **Fase 3** — Bottom nav, refresh portal jamaah, accessibility WCAG 2.1.
- **Fase 4** — PWA standalone gate, dynamic appearance per tenant.
- **Fase 5** — Modul ibadah lengkap; semua page dipindah ke `src/pages/jamaah/ibadah/`.
- **Fase 6** — Tabel `store_*`, RLS, integrasi portal jamaah, review produk.
- **Fase 7** — `pwa_app_layout` JSONB di `website_settings` + `AdminPWAAppLayout` + `usePWAAppLayout` + `MobileBottomNav` dinamis.
- **Fase 8** — VAPID keys, edge function `send-push` & `process-push-queue`, service worker handler, subscription per user, auto trigger (booking status, payment received, store shipped, H-1 keberangkatan), admin `AdminPushOutbox` (status/retry/error/resend manual), cron jobs aktif.
- **Fase 8.x** — Migrasi schema sync + 6 patch type-cast → build Vercel hijau.

---

## 🟡 Sisa Pekerjaan — Fase 9 Polish & Hardening

| Sub-tugas | Status |
|---|---|
| 9.1 Audit Supabase linter warnings (108 → 40) | ✅ Selesai |
| 9.2 Security scan + fix temuan kritis (referral_codes, referral_usages, ticket_responses, customer-documents/payment-proofs upload) | ✅ Selesai |
| 9.3 Konsolidasi struktur kode (`pages/jamaah/ibadah/`) | ✅ Selesai |
| 9.4 Lighthouse audit Landing/Jamaah/Admin | ⏳ Belum |
| 9.5 E2E smoke test alur kritis (register → booking → upload doc → pay → portal) | ⏳ Belum |
| 9.6 Refresh memory index & dokumentasi keputusan baru | ⏳ Belum |

### 9.4 Lighthouse Audit — Rencana

Pakai `browser--navigate_to_sandbox` + `browser--performance_profile` untuk 3 halaman:

1. **Landing `/`** — fokus LCP (hero image), CLS (font Amiri), FCP, INP.
2. **Jamaah Portal `/jamaah`** (perlu login) — fokus bundle size, lazy chunk modul ibadah, react-query refetch, service worker cache hit.
3. **Admin Dashboard `/admin`** (perlu login) — fokus query parallelization, list virtualization, realtime overhead.

Output: tabel metrik per halaman + daftar bottleneck ranked by impact (LCP > CLS > INP > a11y > SEO), lalu sub-plan fix (preload font Amiri, lazy-load chart Recharts, split admin route, image `loading="lazy"`, dll.).

### 9.5 E2E Smoke Test — Alur Kritis

Skenario manual via `browser--act` + `browser--observe`:

1. Register customer baru → verifikasi NIK + passport.
2. Buat booking dari paket aktif → cek `booking_code` format `TRA{Initials}{YYMMDD}{Random4}`.
3. Upload KTP + Passport → cek status Pending → admin Verify.
4. Bayar DP → upload proof → admin verifikasi → status `paid` (bukan `verified`).
5. Login portal jamaah → cek dokumen, jadwal, push subscribe, store browse.

Catat regresi & buat issue ringkas.

### 9.6 Memory Index Refresh

Tambahkan entri memori baru ke `mem://index.md`:

- Push notification system (queue, outbox, retry, VAPID, auto triggers).
- Storage upload hardening (folder `customer_id` enforcement).
- Referral codes/usages RLS scoping.
- Ticket responses owner-only SELECT.
- SECURITY DEFINER execute hardening (REVOKE PUBLIC/anon, GRANT authenticated).

---

## Risiko & Asumsi

- Lighthouse Jamaah/Admin butuh kredensial test login. Kalau tidak tersedia, audit hanya untuk Landing.
- Service worker cache bisa skew metrik FCP — audit dalam mode incognito / clear cache dulu.
- Beberapa SECURITY DEFINER function tetap callable oleh `authenticated` (digunakan di RLS) — bukan vulnerability, sudah didokumentasikan di `@security-memory`.

## Estimasi

- 9.4: 10–15 menit (3 halaman × profile + analisis).
- 9.5: 15–20 menit (manual click-through).
- 9.6: 5 menit (tulis memori).

---

## Appendix — Build Fix Vercel (Fase 8.x, sudah selesai)

Build gagal di `tsc --noEmit` (~30 error). 3 akar masalah & solusi yang sudah dieksekusi:

1. **Schema mismatch** — migrasi tambah tabel `customer_mahrams`, kolom `customers.district`/`village`, tabel `store_product_reviews` (semua + RLS scoped owner/admin).
2. **Type cast** — `usePushSubscription` cast `BufferSource`; `useStore` cast `values as any` + `as unknown as StoreOrder[]`; `JamaahKiblat` cast `(e as any).webkitCompassHeading`.
3. **Kontrak fungsi** — `AdminPushOutbox` refactor `if (err) { toast.error(...); return; }` untuk semua branch.