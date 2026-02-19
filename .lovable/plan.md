

# Perbaikan: HR Settings, Branch Website, dan Agent Management

## Temuan Bug

### 1. HR Settings "Hilang" Setelah Simpan
**Penyebab**: Komponen `Select` dari Radix UI tidak membuat elemen `<select>` native HTML. Ketika form di-submit dan data diambil via `new FormData()`, field `absent_deduction_type` dan `late_deduction_type` **tidak terkirim** karena Radix Select tidak berpartisipasi dalam FormData. Nilai yang tersimpan selalu fallback ke `"fixed"` dan angka 0.

**Perbaikan**: Gunakan React state (`useState`) untuk mengelola semua field settings, bukan `defaultValue` + `FormData`. Saat submit, kirim objek state langsung ke mutation.

### 2. Cabang Belum Bisa Punya Website
**Penyebab Ganda**:
- Cabang "Bandung" memiliki `slug = NULL`. Tanpa slug, rute `/b/:slug` tidak bisa diakses.
- Tidak ada row `website_settings` untuk branch/agent manapun. Sistem hanya fallback ke settings utama.
- Di halaman Admin Branches, tidak ada UI untuk mengelola pengaturan website per cabang (branding, hero, warna, dll).

**Perbaikan**:
- Wajibkan slug saat membuat/edit cabang (jika belum ada).
- Tambahkan tombol "Pengaturan Website" di daftar cabang yang membuka dialog editor branding khusus cabang.
- Saat tombol diklik, auto-create row `website_settings` dengan `branch_id` jika belum ada, lalu tampilkan form editor (logo, warna, hero, tagline).

### 3. Agent Tidak Bisa Ditambah dari Admin
**Penyebab**: `AddAgentDialog` menggunakan `supabase.auth.signUp()` dari sisi klien. Ini menyebabkan:
- Admin yang sedang login **ter-logout** karena session diganti ke user baru.
- Jika email confirmation aktif, user baru belum terverifikasi sehingga tidak bisa login.
- RLS policy gagal karena session berubah di tengah proses insert.

**Perbaikan**: Buat edge function `create-agent` yang menggunakan Supabase Admin API (`service_role`) untuk membuat user tanpa menggangu session admin. Edge function ini akan:
1. Membuat user via `supabase.auth.admin.createUser()`
2. Menambahkan role `agent` ke `user_roles`
3. Membuat record di tabel `agents`
4. Mengembalikan data agent ke frontend

---

## Detail Teknis

### File yang Dimodifikasi/Dibuat

| File | Perubahan |
|------|-----------|
| `AdminHR.tsx` | Refactor settings form: ganti FormData dengan useState untuk semua field termasuk Select |
| `AdminBranches.tsx` | Tambah tombol "Website" per cabang, dialog editor branding cabang |
| `AdminAgents.tsx` | Panggil edge function, bukan signUp langsung |
| `AddAgentDialog.tsx` | Ganti `supabase.auth.signUp` dengan call ke edge function |
| `BranchForm.tsx` | Wajibkan slug, auto-generate dari nama jika kosong |
| `supabase/functions/create-agent/index.ts` | **BARU** - Edge function untuk create agent secara aman |

### Urutan Implementasi

1. **Fix HR Settings** - Refactor form ke controlled state
2. **Fix Agent Creation** - Buat edge function `create-agent` dan update dialog
3. **Fix Branch Website** - Wajibkan slug, tambah UI pengaturan website per cabang, auto-create `website_settings` row

### Edge Function: create-agent

```text
POST /create-agent
Body: { fullName, email, phone, companyName, commissionRate, bankName, bankAccountNumber, bankAccountName, npwp, branchId, parentAgentId }

Flow:
1. Validasi request (auth header wajib, caller harus admin)
2. supabase.auth.admin.createUser({ email, password: random, email_confirm: true })
3. INSERT INTO user_roles (user_id, role) VALUES (newUserId, 'agent')
4. INSERT INTO agents (...) VALUES (...)
5. Return { success: true, agentCode, email }
```

### Migrasi Database
- Update cabang Bandung: SET slug = 'bandung' WHERE slug IS NULL (via data update)

