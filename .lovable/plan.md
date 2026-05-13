
# Analisis Ulang RENCANA.md — Sisa Pekerjaan yang Sebenarnya

Maaf, analisis sebelumnya keliru — saya membaca heading lama (`#### 🔴 PAK-F1 …`) tanpa melihat anotasi `— DONE` yang ditambahkan di akhir judul. Setelah cross-check ulang dengan tabel ringkasan + database + source code, berikut status yang **akurat**.

---

## A. Yang Saya Salah Sebut "Belum" — Padahal SUDAH Selesai ✅

| Item | Bukti |
|---|---|
| **Multi-currency PAK-F1/F2/F3** | `formatCurrency` locale-aware, field currency di `RegularPackageForm` (IDR/USD/SAR/EUR/MYR), departure mewarisi dari package |
| **TAB-FIX1 Konversi tabungan → booking** | RPC `convert_savings_to_booking` + dialog UI |
| **TAB-FIX2 Harga terkunci** | Kolom `locked_price` + price-protection saat konversi |
| **TAB-FIX3 Jadwal cicilan otomatis** | Tabel `savings_schedules` + auto-generate (terverifikasi di DB) |
| **AdminWebhooks** | Tabel `webhook_configs` + `webhook_logs`, tombol Test memanggil `/api/v1/webhook-test` (lampiran "fitur palsu" sudah usang) |
| **Endpoint `POST /api/push/send`** | Sudah ada di `artifacts/api-server/src/routes/push.ts:228` |
| **`scheduled_reports` table & `v_financial_summary` view** | Keduanya ada di DB (cek `information_schema`) |
| **PAK-F7 Bandingkan paket** | `/packages/compare` aktif di PublicRoutes |
| **Loyalty F1/F2 + Badge + Reminder tabungan + Reminder dokumen** | Trigger DB + edge functions + pg_cron (sprint 9) |

---

## B. Yang BENAR-BENAR Masih Pending

### B1. 🔴 Kritis Bisnis (Booking Wizard)
| ID | Item | Catatan |
|---|---|---|
| **BOOK-FIX1** | Multi-currency di **wizard booking**: tambah `bookings.exchange_rate`, `total_price_original`, `total_price_idr`; lock kurs saat submit | DB `bookings.currency` sudah ada, tapi `exchange_rate`/`total_price_idr` belum |
| **BOOK-FIX2** | Wizard adaptif tipe paket: `packages.booking_mode` (umroh/haji/wisata) → Haji skip alokasi kamar, ganti step "Mahram & Kebutuhan Khusus" |
| **PAK-F4** | Tabel `exchange_rates` + halaman admin manajemen kurs harian | Tabel belum ada |
| **PAK-F6** | Booking wizard pakai `price_adult/child/infant` untuk Haji (saat ini tetap pakai price_quad/triple/etc) |

### B2. 🟠 Penting (Booking & Tabungan & Cabang)
| ID | Item |
|---|---|
| **BOOK-FIX3** | Seat hold (lock 15 menit) cegah overbooking — tabel `seat_locks` + countdown UI |
| **BOOK-FIX4** | Pilih DP / Full / Tabungan langsung di Step 4 wizard (kurangi drop-off) |
| **BOOK-FIX6** | Webhook Midtrans auto-confirm + trigger WA notif |
| **BOOK-FIX7** | Guest checkout recovery via email/WA link unik |
| **TAB-FIX4** | Flow pembatalan tabungan + kebijakan refund |
| **TAB-FIX5** | Sertifikat/surat bukti tabungan PDF downloadable |
| **PAK-F5** | Tipe paket dinamis dari `package_types` (saat ini wisata di-hardcode di enum) |
| **KEP-F1** | Validasi flight number — minimal link ke Flightradar24 + notif jika berubah |

### B3. 🟡 Sedang
| ID | Item |
|---|---|
| **PAK-F8** | Filter currency di listing `/packages` |
| **TAB-FIX6** | Tabungan fleksibel (tidak terikat 1 paket) |
| **TAB-FIX7** | DP tabungan via Midtrans (bukan hanya manual) |
| **TAB-FIX8** | Mini-kalkulator tenor di listing tabungan |
| **AGEN-F8** | CRM Leads auto-link ke booking |
| **GAP-RBAC-04/05/06/07** | Audit trail permission, sync code↔DB tool, branch-scoped permission, granular agen |

### B4. 🟢 Jangka Panjang (perlu diskusi arsitektur)
- **N8** i18n Arab/Inggris (200+ file)
- **AGEN-ADD7** SSR/SEO website agen (butuh Next/Remix)
- **AGEN-F1** Withdrawal saldo agen via payment gateway
- **HR Face-verify nyata** + geo-fencing
- **SISKOHAT** Kemenag (butuh akun PPIU resmi)
- **GAP-RBAC-01** Permission granular Read/Write/Delete (breaking change)
- **2FA TOTP** enforcement (saat ini toggle UI sudah, backend OTP belum)
- **AdminSmartNotif / JamaahRingkasanAI / AdminAISummary** — opsional ganti template lokal ke Lovable AI Gateway, atau biarkan + relabel "Statistik"

### B5. ⚙️ Konfigurasi (bukan kode)
Set di Replit Secrets: `MIDTRANS_*`, `SMTP_*`, `VAPID_*`, `VITE_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`.

---

## C. Rencana Eksekusi (3 Sprint, ringkas)

### Sprint 10 — "Wizard Multi-Currency & Adaptif" (≈4 hari) — KRITIS
1. **Migrasi DB:**
   ```sql
   ALTER TABLE bookings 
     ADD COLUMN exchange_rate numeric DEFAULT 1,
     ADD COLUMN total_price_original numeric,
     ADD COLUMN total_price_idr numeric;
   ALTER TABLE packages ADD COLUMN booking_mode text DEFAULT 'umroh';
   CREATE TABLE exchange_rates (
     id uuid PK, currency_from text, currency_to text DEFAULT 'IDR',
     rate numeric, source text DEFAULT 'manual',
     fetched_at timestamptz DEFAULT now(), is_active bool DEFAULT true
   );
   ```
2. Halaman `/admin/exchange-rates` — admin input kurs harian.
3. `useBookingWizardDynamic`: baca `package.currency` + kurs aktif → snapshot saat submit.
4. `BookingWizard`: deteksi `booking_mode='haji'` → skip alokasi kamar, render `StepMahramHaji`.
5. Update `PriceBadge`/`format.ts` agar pass currency dari context.

### Sprint 11 — "Anti Overbooking & Smooth Checkout" (≈3 hari)
1. **BOOK-FIX3** Tabel `seat_locks` (TTL 15 menit) + `SeatHoldCountdown.tsx` + cron release.
2. **BOOK-FIX4** Step 4 wizard: radio "Bayar full / DP / Pakai tabungan".
3. **BOOK-FIX6** Edge function `midtrans-webhook` → auto-update `payment_status='paid'` + enqueue WA via `whatsapp_logs`.
4. **BOOK-FIX7** Generate `bookings.access_token` + email/WA link `/cek-booking?token=…`.

### Sprint 12 — "Polish Tabungan & Operasional" (≈3 hari)
1. **TAB-FIX4/5** Flow pembatalan tabungan + sertifikat PDF (`jspdf`).
2. **PAK-F5** Ganti enum hardcoded → fetch `package_types` dinamis.
3. **PAK-F6** `BookingWizard` Haji pakai `price_adult/child/infant`.
4. **PAK-F8** Filter currency di `/packages`.
5. **KEP-F1** Link Flightradar24 + notif perubahan flight number.

### Backlog (perlu diskusi terpisah)
i18n, SSR website agen, withdrawal otomatis, 2FA TOTP, face-verify nyata, SISKOHAT, RBAC granular RWD.

---

## D. Rekomendasi

Mulai **Sprint 10** karena memblokir penjualan paket Haji USD secara akurat. Setujui plan ini, atau pilih sprint mana yang mau dikerjakan duluan, atau pilih item spesifik (mis. cuma BOOK-FIX2 + BOOK-FIX3) untuk batch yang lebih kecil.
