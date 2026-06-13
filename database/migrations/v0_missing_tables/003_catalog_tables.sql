-- ============================================================
-- V0 MISSING TABLES — 003: Catalog & Configuration Tables
-- Tabel: package_types, equipment_items, theme_presets
-- ============================================================

-- ── 1. PACKAGE_TYPES ─────────────────────────────────────────
-- Jenis paket (Economy, Standard, VIP, VVIP).
-- Direferensikan sebagai FK di package_type_equipment (v3_numbered_features)
-- dan package_hpp_templates.
CREATE TABLE IF NOT EXISTS package_types (
  id            UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name          TEXT        NOT NULL UNIQUE,                    -- 'economy', 'standard', 'vip', 'vvip'
  label         TEXT        NOT NULL,                           -- 'Economy', 'Standard', 'VIP', 'VVIP'
  description   TEXT,
  max_passengers INTEGER,
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_package_types_name ON package_types(name);

DROP TRIGGER IF EXISTS set_package_types_updated_at ON package_types;
CREATE TRIGGER set_package_types_updated_at
  BEFORE UPDATE ON package_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE package_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read package_types"
  ON package_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage package_types"
  ON package_types FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager'))
  );

-- Seed data: 4 tipe paket standar
INSERT INTO package_types (name, label, description, sort_order)
VALUES
  ('economy',  'Economy',  'Paket hemat dengan fasilitas standar',          1),
  ('standard', 'Standard', 'Paket reguler dengan fasilitas lengkap',         2),
  ('vip',      'VIP',      'Paket premium dengan hotel bintang 5',           3),
  ('vvip',     'VVIP',     'Paket eksklusif dengan layanan personal penuh',  4)
ON CONFLICT (name) DO NOTHING;


-- ── 2. EQUIPMENT_ITEMS ────────────────────────────────────────
-- Katalog perlengkapan ibadah (berbeda dari tabel `equipment` yang merupakan
-- inventaris fisik per cabang).
-- Direferensikan sebagai FK di equipment_distributions.equipment_item_id
-- dan package_type_equipment.equipment_item_id.
--
-- CATATAN: fase16_new_tables.sql membuat tabel `equipment` (inventaris fisik)
-- dengan komentar "tabel baru, terpisah dari equipment_items yang sudah ada".
-- Artinya equipment_items adalah katalog item, equipment adalah stok fisik.
CREATE TABLE IF NOT EXISTS equipment_items (
  id             UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name           TEXT        NOT NULL,                          -- 'Koper Kecil', 'Buku Manasik', dll
  category       TEXT        NOT NULL DEFAULT 'general'
                             CHECK (category IN ('pakaian','tas','buku','aksesoris','perlengkapan','general')),
  description    TEXT,
  unit           TEXT        DEFAULT 'pcs',                     -- pcs, set, pasang
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipment_items_category  ON equipment_items(category);
CREATE INDEX IF NOT EXISTS idx_equipment_items_is_active ON equipment_items(is_active);

DROP TRIGGER IF EXISTS set_equipment_items_updated_at ON equipment_items;
CREATE TRIGGER set_equipment_items_updated_at
  BEFORE UPDATE ON equipment_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE equipment_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read equipment_items"
  ON equipment_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage equipment_items"
  ON equipment_items FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','equipment','operational'))
  );

-- Seed data: perlengkapan umroh/haji standar
INSERT INTO equipment_items (name, category, description, unit)
VALUES
  ('Koper Besar',       'tas',         'Koper 24 inch untuk bagasi pesawat',      'pcs'),
  ('Koper Kabin',       'tas',         'Koper 20 inch untuk kabin',               'pcs'),
  ('Tas Selempang',     'tas',         'Tas selempang untuk ibadah',              'pcs'),
  ('Buku Manasik',      'buku',        'Panduan manasik umroh/haji',              'pcs'),
  ('Buku Doa',          'buku',        'Kumpulan doa & dzikir',                   'pcs'),
  ('Seragam',           'pakaian',     'Seragam jamaah (kemeja/gamis)',            'set'),
  ('Ihram',             'pakaian',     'Kain ihram untuk jamaah pria',            'set'),
  ('Mukena',            'pakaian',     'Mukena untuk jamaah wanita',              'pcs'),
  ('Gelang Identitas',  'aksesoris',   'Gelang nama & nomor kontak darurat',      'pcs'),
  ('ID Card',           'aksesoris',   'Kartu identitas jamaah',                  'pcs'),
  ('Paspor Holder',     'aksesoris',   'Tempat penyimpanan dokumen perjalanan',   'pcs'),
  ('Sandal',            'pakaian',     'Sandal ibadah',                           'pcs')
ON CONFLICT DO NOTHING;


-- ── 3. THEME_PRESETS ─────────────────────────────────────────
-- Preset tema visual untuk website travel portal.
-- v4_patches/20260511053018_7ec5b9d8.sql menambah kolom-kolom berikut
-- via ALTER TABLE — jadi tabel ini harus ada lebih dulu.
CREATE TABLE IF NOT EXISTS theme_presets (
  id               UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  slug             TEXT        NOT NULL UNIQUE,
  name             TEXT        NOT NULL,
  description      TEXT,
  -- Warna utama
  primary_color    TEXT        NOT NULL DEFAULT '#1a56db',
  secondary_color  TEXT        DEFAULT '#7e3af2',
  accent_color     TEXT        DEFAULT '#ff5a1f',
  background_color TEXT        DEFAULT '#ffffff',
  foreground_color TEXT        DEFAULT '#111928',
  surface_color    TEXT        DEFAULT '#f9fafb',
  -- Tipografi
  heading_font     TEXT        DEFAULT 'Inter',
  body_font        TEXT        DEFAULT 'Inter',
  -- Metadata visual (ditambah via 20260511053018)
  mood             TEXT        DEFAULT 'professional'
                               CHECK (mood IN ('professional','elegant','warm','modern','classic','bold')),
  accent_gold      BOOLEAN     DEFAULT false,
  radius_style     TEXT        DEFAULT 'rounded'
                               CHECK (radius_style IN ('sharp','rounded','pill')),
  density          TEXT        DEFAULT 'comfortable'
                               CHECK (density IN ('compact','comfortable','spacious')),
  hero_variant     TEXT        DEFAULT 'split'
                               CHECK (hero_variant IN ('centered','split','fullscreen','minimal')),
  cta_variant      TEXT        DEFAULT 'filled'
                               CHECK (cta_variant IN ('filled','outlined','ghost')),
  card_style       TEXT        DEFAULT 'elevated'
                               CHECK (card_style IN ('flat','elevated','bordered')),
  ornament         TEXT        DEFAULT 'none'
                               CHECK (ornament IN ('none','geometric','floral','arabic','subtle')),
  -- Status
  is_default       BOOLEAN     NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_theme_presets_slug       ON theme_presets(slug);
CREATE INDEX IF NOT EXISTS idx_theme_presets_is_default ON theme_presets(is_default);

DROP TRIGGER IF EXISTS set_theme_presets_updated_at ON theme_presets;
CREATE TRIGGER set_theme_presets_updated_at
  BEFORE UPDATE ON theme_presets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE theme_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read theme presets"
  ON theme_presets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage theme presets"
  ON theme_presets FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner'))
  );

-- Seed: 7 tema default (disebutkan dalam v4_patches/20260511053018_7ec5b9d8.sql)
INSERT INTO theme_presets (slug, name, description, primary_color, secondary_color, accent_color, background_color, foreground_color, heading_font, body_font, mood, accent_gold, surface_color, radius_style, density, hero_variant, cta_variant, card_style, ornament, is_default)
VALUES
  ('default',    'Default Blue',   'Tema biru profesional default',    '#1a56db','#7e3af2','#ff5a1f','#ffffff','#111928','Inter',    'Inter',    'professional', false, '#f9fafb', 'rounded',  'comfortable', 'split',      'filled',   'elevated', 'none',     true),
  ('emerald',    'Emerald Green',  'Tema hijau elegan islami',         '#059669','#065f46','#d97706','#ffffff','#111928','Playfair Display','Inter','elegant',   true,  '#f0fdf4', 'rounded',  'comfortable', 'split',      'filled',   'elevated', 'arabic',   false),
  ('royal',      'Royal Purple',   'Tema ungu mewah premium',          '#7e3af2','#5521b5','#ff5a1f','#faf5ff','#1e1b4b','Cormorant Garamond','Inter','elegant',true, '#f5f3ff', 'rounded',  'spacious',    'fullscreen', 'filled',   'elevated', 'floral',   false),
  ('golden',     'Golden Haji',    'Tema emas hangat nuansa Arab',     '#b45309','#92400e','#d97706','#fffbeb','#1c1917','Cormorant Garamond','Inter','warm',    true,  '#fef9c3', 'rounded',  'comfortable', 'centered',   'filled',   'bordered', 'arabic',   false),
  ('midnight',   'Midnight',       'Tema gelap modern profesional',    '#1a56db','#3730a3','#f59e0b','#0f172a','#f8fafc','Inter',    'Inter',    'modern',       false, '#1e293b', 'sharp',    'compact',     'split',      'outlined', 'flat',     'geometric',false),
  ('rose',       'Rose Garden',    'Tema merah muda lembut',           '#e11d48','#9f1239','#f59e0b','#fff1f2','#1c1917','Playfair Display','Inter','warm',     false, '#ffe4e6', 'pill',     'spacious',    'centered',   'filled',   'elevated', 'floral',   false),
  ('slate',      'Slate Classic',  'Tema abu-abu minimalis bersih',    '#475569','#334155','#0ea5e9','#f8fafc','#0f172a','Inter',    'Inter',    'classic',      false, '#f1f5f9', 'sharp',    'compact',     'minimal',    'ghost',    'flat',     'none',     false)
ON CONFLICT (slug) DO NOTHING;
