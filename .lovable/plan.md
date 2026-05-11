## Analisis Cepat

Repo punya **7 template** (`classic, modern, luxury, islamic, futuristic, nature, royal`) — tiap template hanya punya komponen Hero & CTA sendiri. Sisanya (FeaturedPackages, Testimonials, WhyChooseUs, QuickMenuGrid, BannerCarousel) cuma di-special-case untuk `royal`. Tabel `theme_presets` di database **kosong**, sehingga tab "Tema Preset" mati. Pemilih layout (PageBuilder) hanya mengatur urutan & visibilitas section, bukan struktur per-template.

### Bug Tema yang Ditemukan
1. **`theme_presets` kosong** → tab "Tema Preset" tidak menampilkan apa-apa (`ThemeSelector` mengiterasi array kosong).
2. **Apply template tidak ikut warna/font** → memilih "Royal Gold" tetap memakai palet hijau default; hanya field `template` yang berubah, `primary/secondary/accent/heading_font/body_font` tidak.
3. **80% halaman publik tidak responsif terhadap template** → hanya Hero + CTA yang berganti; section lain hanya kenal `royal`. Akibatnya 5 dari 7 tema (Modern, Luxury, Islamic, Futuristic, Nature) tampil setengah-setengah.
4. **Long ternary chain** di `Index.tsx` & `BranchWebsite.tsx` (`template === 'royal' ? ... : (template === 'luxury' ? ...))`) — fragile, duplikat di 2 tempat, tidak skalabel.
5. **`AgentWebsite` tidak ikut switch template** (perlu verifikasi) → tenant agent selalu "classic".
6. **`TenantPublicLayout` tidak punya `AnnouncementBar` / `MobileBottomNav` / `PWAInstallPrompt`** padahal `DynamicPublicLayout` punya — inkonsistensi tenant.
7. **CSS var `--muted/--border` dihitung dari split string warna** di `ThemeProvider` — rapuh kalau format HSL tidak persis "H S L".
8. **Preview di `ThemeSelector` & `TemplateSelector` statis** (kotak warna), bukan render asli template.
9. **Layout per-template tidak bisa diatur** dari admin (jumlah kolom paket, density section, posisi search widget, dll. di-hard-code).

---

## Rencana Perbaikan

### Fase 1 — Pondasi: Theme Tokens & Registry (1 source of truth)

Buat berkas baru `artifacts/umrah-haji/src/lib/themes/registry.ts` berisi 7 tema sebagai objek terstruktur:

```ts
type ThemeTokens = {
  slug: 'classic'|'modern'|'luxury'|'islamic'|'futuristic'|'nature'|'royal';
  name: string; description: string;
  colors: { primary, secondary, accent, background, foreground, surface, accentGold? }; // semua HSL
  fonts: { heading: string; body: string };
  radius: 'sharp'|'soft'|'pill';
  density: 'compact'|'comfortable'|'spacious';
  mood: 'light'|'dark'|'sepia';
  ornaments: { kind: 'none'|'islamic'|'neon'|'serif-divider'|'leaf'|'gold-foil'; intensity: 0|1|2 };
  components: { hero: ComponentKey; cta: ComponentKey; cards: 'flat'|'glass'|'bordered'|'elevated' };
};
```

Buat `THEMES: Record<slug, ThemeTokens>` lengkap untuk 7 tema (palet baru yang lebih premium & tidak overlap).

### Fase 2 — Migration Database: Seed `theme_presets` + kolom layout

Migration baru:
- `INSERT … ON CONFLICT (slug) DO UPDATE` 7 baris ke `theme_presets` (sinkron dgn registry).
- Tambah kolom `website_settings.layout_variant jsonb` (per-section: `{ hero: 'split'|'fullscreen'|'asymmetric', packages: 'grid-3'|'grid-4'|'carousel', testimonials: 'grid'|'masonry'|'slider', density: '...' }`).
- Tambah kolom `website_settings.theme_overrides jsonb` (kustomisasi per-tema tanpa kehilangan preset).

### Fase 3 — Redesain 7 Hero & CTA (refactor)

Ganti 14 komponen `<Theme>HeroSection.tsx` & `<Theme>CTASection.tsx` jadi **2 komponen polimorfik** + variant:

```
src/components/home/hero/index.tsx        // dispatch by registry.components.hero
src/components/home/hero/variants/{Split,Fullscreen,Asymmetric,Neon,Serene,Royal,Classic}.tsx
src/components/home/cta/...                // sama
```

Tiap variant pakai semantic tokens (`bg-primary`, `text-foreground`, `border-border`) — **tidak ada warna hard-coded** lagi. Aksen khusus tema (emas royal/luxury, neon futuristic) dipindah ke CSS var tambahan: `--theme-accent-gold`, `--theme-glow`.

### Fase 4 — Theming Universal di Section Lain

Hapus semua `isRoyal` di `Testimonials, WhyChooseUs, QuickMenuGrid, FeaturedPackages, BannerCarousel`. Ganti dgn helper `useTheme()` yang baca registry + token. Setiap section dapat 2–3 varian yang dipilih oleh `layout_variant`.

### Fase 5 — `ThemeProvider` Anti-Bug

- Pakai `parseHsl()` yang aman (regex `\d+\s+\d+%\s+\d+%`) untuk turunan `--muted/--border`.
- Saat user apply preset, **gabungkan** preset → `website_settings` (warna+font+template+layout default tema) dalam satu mutasi.
- Tambahkan CSS var: `--radius-base`, `--density-y`, `--theme-accent-gold`, `--theme-glow`.

### Fase 6 — UI Pengaturan Tampilan Baru

Refactor tab "Template" + "Tema Preset" jadi **satu tab "Tema"** dengan 3 sub-section:
1. **Pilih Tema** — 7 kartu dengan **mini live-preview asli** (render Hero variant dlm `<iframe srcDoc>` mini atau div skala 0.25).
2. **Layout Halaman** — picker per-section: hero variant, kolom paket (3/4), gaya testimoni (grid/slider), density, radius (sharp/soft/pill), mood (light/dark/sepia).
3. **Kustomisasi Lanjutan** — color pickers, font picker, ornament toggle (semua disimpan ke `theme_overrides`, tombol "Reset ke preset").

### Fase 7 — Konsistensi Tenant & Cleanup

- `TenantPublicLayout` dilengkapi `AnnouncementBar`, `MobileBottomNav`, `PWAInstallPrompt` (sama dgn `DynamicPublicLayout`).
- `Index.tsx`, `BranchWebsite.tsx`, `AgentWebsite.tsx` semua memakai `useThemeDispatch()` baru — hapus ternary chain.
- Hapus 14 file `<Theme>HeroSection.tsx`/`<Theme>CTASection.tsx` lama.
- Memory: tambah catatan "Theme registry" di `mem://design/`.

---

## Detail Teknis Singkat

```text
Pengaturan Tampilan
└── Tab "Tema"
    ├── Pilih Tema (7 kartu live-preview)
    ├── Layout Halaman (per-section variant + density/radius/mood)
    └── Kustomisasi Lanjutan (warna/font/ornamen → theme_overrides)
       │
       ▼
website_settings { template, primary_color, …, layout_variant, theme_overrides }
       │
       ▼
ThemeProvider → CSS vars + theme registry merge
       │
       ▼
Komponen polimorfik (hero/cta/cards/testimonials/...) baca registry
```

**Perkiraan effort:** Fase 1–2: 30 menit. Fase 3: 60–90 menit (komponen terbanyak). Fase 4: 30 menit. Fase 5–7: 30 menit. Total ~3 jam kerja agent.

**Risiko:** (a) breaking change di branch/agent tenant — perlu smoke test 3 rute (`/`, `/cabang/<slug>`, `/agen/<slug>`); (b) cache theme di `localStorage` perlu bump `CURRENT_THEME_VERSION` ke `'3'`; (c) `theme_overrides` kosong harus di-fallback ke registry, bukan ke `null`.

**Yang TIDAK diubah:** logic booking, payment, RBAC, RLS, migrations sebelumnya, `types.ts`. Murni front-end + 1 migration tambahan.

## Update — Fase 3 (selesai sebagian)
- Dispatcher polimorfik `ThemedHeroSection` & `ThemedCTASection` dibuat di `src/components/home/`. Memilih varian Hero/CTA berdasarkan `useTheme().layout` (registry + `website_settings.layout_variant`).
- Refaktor `Index.tsx`, `BranchWebsite.tsx`, `AgentWebsite.tsx`: ternary chain panjang dihapus, kini hanya memanggil dispatcher → konsistensi 7 tema.
- Sisa pekerjaan (Fase 4-7): hapus `isRoyal` hardcode di Testimonials/WhyChooseUs/QuickMenuGrid/FeaturedPackages/BannerCarousel, integrasikan tokens registry ke `ThemeProvider` (CSS vars `--theme-accent-gold`, `--radius` dinamis, density), tambahkan komponen TenantPublicLayout yang hilang, dan UI Appearance tab "Tema" dengan live-preview + per-section layout editor.

## Update — Fase 4-7 (selesai)
- **Fase 4**: `isRoyal` di Testimonials/WhyChooseUs/QuickMenuGrid/FeaturedPackages/DynamicNavbar/DynamicFooter sekarang derive dari `useTheme(settings).isDark` — tema dark (royal+futuristic) konsisten gelap.
- **Fase 5**: ThemeProvider menyuntikkan token registry sebagai CSS vars (`--radius`, `--section-py`, `--theme-accent-gold`, `--theme-mood`) dan fallback warna/font kini mengambil dari `getTheme(template)`.
- **Fase 6**: `LayoutVariantEditor` baru di tab Layout — admin bisa override hero/cta/packages/testimonials variant per tenant; tersimpan di `website_settings.layout_variant`.
- **Fase 7**: `TenantPublicLayout` kini sejajar dengan `DynamicPublicLayout` (AnnouncementBar, MobileBottomNav, PWAInstallPrompt, WhatsAppWidget). Tipe `WebsiteSettings` di kedua hook ditambahkan `layout_variant` & `theme_overrides`.
