# Website Templates & Subdomain Management

## Overview

Menambahkan 2 template website yang bisa dipilih user, serta fitur pengaturan subdomain (slug) untuk cabang dan agen langsung dari halaman profil masing-masing , bisa di atur admin atau mereka sendiri, jika nama domain terdetek sudah ada berarti tidak bisa digunakan. 

---

## Bagian 1: 2 Template Website

### Template yang Dibuat

**Template 1 - "Classic"** (Default)

- Layout yang sudah ada saat ini: Hero besar dengan search widget, statistik angka, dan section-section standar
- Cocok untuk tampilan profesional dan korporat

**Template 2 - "Modern Minimalist"**

- Hero split-screen (teks di kiri, gambar di kanan) tanpa search widget
- Section paket dalam layout carousel/horizontal scroll
- CTA section dengan background gradient dan desain card
- Tampilan lebih clean dan modern

### Cara Kerja

- Kolom `template` ditambahkan ke tabel `website_settings` (default: `'classic'`)
- Di halaman Admin Appearance, tab baru "Template" ditampilkan di urutan pertama dengan preview visual dari kedua template
- Saat user memilih template, komponen yang dirender di halaman publik berubah sesuai template yang dipilih
- Komponen baru: `ModernHeroSection`, `ModernCTASection` sebagai alternatif dari `DynamicHeroSection` dan `DynamicCTASection`

---

## Bagian 2: Pengaturan Subdomain (Slug)

### Database

- Tambah kolom `slug` (VARCHAR, UNIQUE, nullable) ke tabel `branches` dan `agents`
- Tambah kolom `branch_id`, `agent_id`, dan `template` ke tabel `website_settings`

### UI Pengaturan Slug

**Di halaman Admin Branches (`AdminBranches.tsx`)**

- Tambahkan field "Subdomain" di `BranchForm.tsx` dengan format: `sistemumroh.lovable.app/b/[slug]`
- Validasi: huruf kecil, angka, strip saja (regex)
- Preview URL langsung ditampilkan di bawah input

**Di halaman Admin Agents (`AdminAgents.tsx`)**

- Tambahkan field "Subdomain" di dialog detail/edit agent
- Format: `sistemumroh.lovable.app/a/[slug]`
- Validasi sama dengan cabang

### Routing

- Route `/b/:branchSlug` dan `/a/:agentSlug` sudah ada di `PublicRoutes.tsx`
- Update `BranchWebsite.tsx` dan `AgentWebsite.tsx` untuk menggunakan template yang dipilih

---

## Detail Teknis

### 1. Migrasi Database

```sql
-- Tambah slug ke branches dan agents
ALTER TABLE branches ADD COLUMN slug VARCHAR(100) UNIQUE;
ALTER TABLE agents ADD COLUMN slug VARCHAR(100) UNIQUE;

-- Tambah kolom tenant dan template ke website_settings
ALTER TABLE website_settings ADD COLUMN branch_id UUID REFERENCES branches(id);
ALTER TABLE website_settings ADD COLUMN agent_id UUID REFERENCES agents(id);
ALTER TABLE website_settings ADD COLUMN template TEXT NOT NULL DEFAULT 'classic';
```

### 2. File yang Dibuat

- `src/components/home/ModernHeroSection.tsx` - Hero split-screen untuk template Modern
- `src/components/home/ModernCTASection.tsx` - CTA card-style untuk template Modern
- `src/components/admin/appearance/TemplateSelector.tsx` - UI pilih template di Admin Appearance

### 3. File yang Dimodifikasi

- `src/pages/admin/AdminAppearance.tsx` - Tambah tab "Template"
- `src/components/admin/forms/BranchForm.tsx` - Tambah field slug
- `src/pages/admin/AdminAgents.tsx` - Tambah field slug di dialog edit
- `src/hooks/useWebsiteSettings.ts` - Update interface dan query untuk template
- `src/pages/public/BranchWebsite.tsx` - Render berdasarkan template
- `src/pages/public/AgentWebsite.tsx` - Render berdasarkan template
- `src/pages/Index.tsx` - Render berdasarkan template

### 4. Alur Template Selection

1. Admin buka Pengaturan Tampilan > Tab "Template"
2. Melihat 2 card preview: Classic dan Modern Minimalist
3. Klik "Terapkan" pada template yang diinginkan
4. Website publik langsung berubah layout-nya
5. Template berlaku untuk website utama dan bisa di-override per cabang/agen