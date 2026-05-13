
# Audit & Rencana Perbaikan Menu Pengaturan

## 1. Temuan Utama (urut prioritas)

### A. KRITIS — Keamanan
1. **2FA palsu** (`Admin2FASettings.tsx:107-116`)
   Komentar eksplisit: *"we'll skip verification step and enable directly"*. Status `is_enabled=true` disimpan ke `user_2fa_settings` **tanpa OTP**, dan tidak ada gate di flow login (`/auth/login`) yang memverifikasi kode. Akibatnya halaman 2FA hanya pajangan — tidak melindungi akun apa pun.
2. **Akses simulator pakai RPC lama** (`AdminAccessSimulator.tsx`) memanggil `get_user_effective_permissions` (legacy), sedangkan production pakai `get_user_effective_permissions_v2` (`useEffectivePermissions.ts`). Hasil simulasi bisa beda dengan kenyataan sehingga audit menyesatkan.
3. **Service role / VAPID / Midtrans secret diinput dari UI** lalu disimpan ke `app_settings` (`AdminSettings.tsx` tab *API Keys*, daftar `API_KEY_FIELDS` line 95-102). Service-role key tidak boleh hidup di tabel publik — harus pindah ke Edge Function secret.

### B. Duplikasi & Tumpang Tindih
| Masalah | Halaman terkait |
|---|---|
| **3 halaman RBAC terpisah** untuk satu domain | `/admin/roles` (AdminRoleManagement), `/admin/rbac-tools`, `/admin/rbac-status` |
| **2 tempat untuk API/Integrasi** | Tab *Integrasi & API Keys* di `/admin/settings` **vs** halaman penuh `/admin/api-connect` (1.361 baris) |
| **2 tempat untuk Tampilan** | Tab *Tampilan* + *Menu Sidebar* di `/admin/settings` **vs** halaman penuh `/admin/appearance` (403 baris dengan 20+ tab) |
| **Halaman yatim** | `/admin/dashboard-access` di-`Navigate` ke `/admin/roles?tab=user-overrides`, tapi file `DashboardAccessManager.tsx` masih ada dan tidak terpakai |
| **Audit terpencar** | `AdminSecurityAudit` (activity+audit+login), `AdminActivityLog`, `PermissionAuditLog` (di tab Roles) — semuanya log tapi di tempat berbeda |
| **PWA Settings** ada (`/admin/pwa-settings`) tapi tidak masuk grup *Pengaturan*, hanya bisa diakses dari dropdown user |

### C. Kualitas Kode
- `AdminSettings.tsx` (1.182 baris) dan `AdminApiConnect.tsx` (1.361 baris) monolitik, banyak `as any`, `// eslint-disable-next-line react-hooks/exhaustive-deps` (stale form), `console.error` mentah.
- Grup menu *Pengaturan* berisi **12 item** (`admin-menu-registry.ts:141-152`). Sidebar terlalu panjang dan banyak super-admin-only yang seharusnya di-hide bagi role lain (sebagian sudah, sebagian belum — `supabase-setup`, `webhooks`, `api-connect` muncul untuk semua yang punya permission).
- Label tidak konsisten: "API Connect ke Apps", "Panduan Setup Supabase" (technical leak — seharusnya "Panduan Setup Backend").

### D. UX
- Tidak ada landing/hub untuk grup Pengaturan — user harus menebak halaman mana untuk apa.
- "Pengaturan Umum" menampung 10 sub-section (profile, company, bank, dokumen, notifikasi, tampilan, sidebar, keamanan, api keys, danger) → scroll panjang, navigasi sidebar lokal sulit dibedakan dari sidebar utama.

---

## 2. Rencana Perbaikan

### Fase 1 — Tambal Keamanan (wajib lebih dulu)
1. **Implementasi 2FA nyata**:
   - Edge Function baru `request-2fa-otp` (kirim OTP via email/Fonnte WA, simpan hash + expiry di tabel `user_2fa_codes`).
   - Edge Function `verify-2fa-otp` dipanggil saat setup *dan* saat login.
   - Tambah gate di `useAuth` / `/auth/login`: kalau `user_2fa_settings.is_enabled=true`, paksa step OTP sebelum redirect.
   - `Admin2FASettings.tsx` ubah `handleSetup` → kirim OTP dulu, baru `enableMutation` setelah OTP valid.
2. **Sinkronkan AdminAccessSimulator** ke `get_user_effective_permissions_v2` + ekspansi role hierarchy (sama seperti `useEffectivePermissions`).
3. **Pindahkan service-role / VAPID private / Midtrans server key** dari `app_settings` ke Edge Function secret (gunakan `secrets--add_secret`). Hapus field tsb dari `API_KEY_FIELDS` di `AdminSettings.tsx`; tampilkan info "dikelola via secret backend".

### Fase 2 — Konsolidasi Halaman (rapikan grup *Pengaturan*)
Susun ulang menu jadi **6 entry top-level** + sub-tab di dalam:

```text
Pengaturan
├─ Pengaturan Umum        /admin/settings        (Profil, Perusahaan, Bank, Dokumen, Notifikasi, Danger Zone)
├─ Tampilan & Branding    /admin/appearance      (semua tab tema + Sidebar Manager + PWA)
├─ Hak Akses (RBAC)       /admin/access          (tabs: Users · Roles · Matriks · Tools · Status · Simulator · Audit)
├─ Integrasi & API        /admin/integrations    (tabs: API Keys backend · Public API Keys · Webhooks · Email Template · Push)
├─ Keamanan               /admin/security        (tabs: 2FA · Activity Log · Audit Log · Login Attempts)
└─ Panduan Backend        /admin/backend-guide   (rename dari supabase-setup)
```

Detail aksi:
- **Hak Akses**: jadikan `AdminRoleManagement` sebagai shell, pindah `AdminUsers`, `AdminRBACTools`, `AdminRBACStatus`, `AdminAccessSimulator` jadi tab. Buang halaman `DashboardAccessManager.tsx` yatim (sudah di-redirect).
- **Tampilan**: gabung sub-section *Tampilan* + *Menu Sidebar* dari `AdminSettings` ke `AdminAppearance` (tambah tab "Sidebar"). Pindahkan `AdminPWASettings` jadi tab "PWA & Install". Hapus tab terkait dari `AdminSettings`.
- **Integrasi & API**: `AdminApiConnect` (public API key + webhook + test) jadi tab pertama. Tab kedua "Backend Keys" pakai sisa field dari `AdminSettings` (Supabase URL/anon, Fonnte, SMTP — bukan service role). Tambahkan tab "Email Template" (route eksisting `/admin/email-templates`) & "Push" (`/admin/push-notifications`+`push-outbox`).
- **Keamanan**: gabung `AdminSecurityAudit`, `Admin2FASettings`, `AdminActivityLog` jadi tab di `/admin/security`. `PermissionAuditLog` tetap di Hak Akses (lebih kontekstual).
- Update `admin-menu-registry.ts`: hapus 6 entry lama, ganti 6 entry baru, sesuaikan `required_permission`.
- Update `AdminRoutes.tsx`: tambah redirect dari path lama ke path baru supaya bookmark tidak rusak.

### Fase 3 — Refactor & Kualitas Kode
- Pecah `AdminSettings.tsx` menjadi 5 file `<200` baris per section di `components/admin/settings/`.
- Pecah `AdminApiConnect.tsx` menjadi `ApiKeysPanel`, `WebhooksPanel`, `ApiTesterPanel`, `RateLimitPanel`.
- Hapus `as any` dengan tipe yang sudah ada di `types/database.ts`; ganti `console.error` ke `toast.error` + log struktural.
- Hapus `// eslint-disable-next-line react-hooks/exhaustive-deps` — gunakan `reset` form di `onSuccess` query, bukan effect manual.
- Tambahkan **Settings Hub** sederhana di `/admin/settings/index` yang menampilkan 6 kartu navigasi ke sub-halaman + status (mis. "2FA aktif", "12 webhook").

### Fase 4 — UX & Konsistensi
- Standardisasi label Bahasa Indonesia, hilangkan jargon ("Supabase" → "Backend").
- Sembunyikan menu super-admin-only di sidebar untuk role lain via `permission` yang benar (saat ini `webhooks`, `api-connect`, `supabase-setup` masih bocor ke role yang sekadar punya permission key).
- Tambah breadcrumb seragam (sudah ada pattern di `AdminRoleManagement`) ke 6 halaman baru.

---

## 3. Urutan Eksekusi yang Disarankan
1. Fase 1 (3 patch terpisah, masing-masing kecil & terverifikasi).
2. Fase 2 dilakukan per-halaman: mulai dari **Hak Akses** (paling banyak duplikasi), lanjut **Integrasi**, **Keamanan**, **Tampilan**.
3. Fase 3 menyusul setelah halaman gabungan stabil.
4. Fase 4 sebagai polish.

Saya tunggu konfirmasi: **mau saya mulai langsung dari Fase 1 (tambal keamanan), atau prioritaskan Fase 2 (konsolidasi UI) dulu?**
