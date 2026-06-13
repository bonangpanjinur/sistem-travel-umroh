-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 028: Seed Data — Roles & Menu Items
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. MEMBERSHIP_PLANS seed
-- ---------------------------------------------------------------------------
INSERT INTO public.membership_plans (name, type, commission_base, max_sub_agents, monthly_fee, features)
VALUES
  ('Silver', 'silver', 3.0, 5,  0,      '{"badge":"silver","priority_support":false,"analytics":false}'),
  ('Gold',   'gold',   5.0, 20, 150000, '{"badge":"gold","priority_support":true,"analytics":false}'),
  ('Platinum','platinum',7.5,100,500000,'{"badge":"platinum","priority_support":true,"analytics":true}')
ON CONFLICT (type) DO UPDATE SET
  commission_base = EXCLUDED.commission_base,
  max_sub_agents  = EXCLUDED.max_sub_agents,
  monthly_fee     = EXCLUDED.monthly_fee,
  features        = EXCLUDED.features;

-- ---------------------------------------------------------------------------
-- 2. AGENT_COMMISSION_TIERS seed
-- ---------------------------------------------------------------------------
INSERT INTO public.agent_commission_tiers (name, plan_type, min_bookings, max_bookings, commission_rate, bonus_amount)
VALUES
  ('Silver Tier 1', 'silver', 0,   10, 3.0, 0),
  ('Silver Tier 2', 'silver', 11,  30, 3.5, 0),
  ('Silver Tier 3', 'silver', 31, NULL, 4.0, 0),
  ('Gold Tier 1',   'gold',   0,   20, 5.0, 500000),
  ('Gold Tier 2',   'gold',   21,  50, 5.5, 1000000),
  ('Gold Tier 3',   'gold',   51, NULL, 6.0, 2000000),
  ('Platinum Tier 1','platinum',0, 50, 7.5, 2000000),
  ('Platinum Tier 2','platinum',51,100, 8.0, 5000000),
  ('Platinum Tier 3','platinum',101,NULL,8.5,10000000)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. MENU_ITEMS seed — Navigasi sidebar admin
-- ---------------------------------------------------------------------------
INSERT INTO public.menu_items (label, icon, path, sort_order, is_active, roles)
VALUES
  ('Dashboard',     'LayoutDashboard', '/admin',                    1, TRUE,
    ARRAY['super_admin','owner','it','admin','branch_manager','finance','operational','operator','sales','marketing','equipment']::public.app_role[]),
  ('Booking',       'BookOpen',        '/admin/bookings',           2, TRUE,
    ARRAY['super_admin','owner','admin','operator','sales','branch_manager']::public.app_role[]),
  ('Jamaah',        'Users',           '/admin/customers',          3, TRUE,
    ARRAY['super_admin','owner','admin','operator','sales']::public.app_role[]),
  ('Keberangkatan', 'Plane',           '/admin/departures',         4, TRUE,
    ARRAY['super_admin','owner','admin','operational']::public.app_role[]),
  ('Paket',         'Package',         '/admin/packages',           5, TRUE,
    ARRAY['super_admin','owner','admin','marketing']::public.app_role[]),
  ('Keuangan',      'DollarSign',      '/admin/finance',            6, TRUE,
    ARRAY['super_admin','owner','finance']::public.app_role[]),
  ('Agen',          'Handshake',       '/admin/agents',             7, TRUE,
    ARRAY['super_admin','owner','admin','sales']::public.app_role[]),
  ('Perlengkapan',  'Package2',        '/admin/equipment',          8, TRUE,
    ARRAY['super_admin','admin','equipment','operational']::public.app_role[]),
  ('Karyawan',      'UserCheck',       '/admin/employees',          9, TRUE,
    ARRAY['super_admin','owner','admin','branch_manager']::public.app_role[]),
  ('Marketing',     'Megaphone',       '/admin/marketing',         10, TRUE,
    ARRAY['super_admin','admin','marketing']::public.app_role[]),
  ('CMS Website',   'Globe',           '/admin/cms',               11, TRUE,
    ARRAY['super_admin','it','admin','marketing']::public.app_role[]),
  ('Pengaturan',    'Settings',        '/admin/settings',          12, TRUE,
    ARRAY['super_admin','it']::public.app_role[]),
  ('Audit Log',     'Shield',          '/admin/audit',             13, TRUE,
    ARRAY['super_admin','it','owner']::public.app_role[])
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. WEBSITE_SETTINGS singleton seed
-- ---------------------------------------------------------------------------
INSERT INTO public.website_settings (
  id, site_name, tagline, primary_color, secondary_color,
  contact_phone, contact_email, social_wa
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Vinstour',
  'Travel Umroh & Haji Terpercaya',
  '#1e40af',
  '#d97706',
  '+62821-0000-0000',
  'info@vinstour.com',
  'https://wa.me/6282100000000'
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. CONTACT_PAGE_CONTENT singleton seed
-- ---------------------------------------------------------------------------
INSERT INTO public.contact_page_content (
  id, address, phone, email, office_hours
)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Jl. Contoh No. 1, Jakarta Selatan',
  '+62821-0000-0000',
  'info@vinstour.com',
  'Senin–Jumat 08:00–17:00 WIB'
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. CHART_OF_ACCOUNTS seed — Akun dasar umroh travel
-- ---------------------------------------------------------------------------
INSERT INTO public.chart_of_accounts (code, name, type, sort_order)
VALUES
  -- ASSET
  ('1000', 'Aktiva',               'asset',   100),
  ('1100', 'Kas & Bank',           'asset',   110),
  ('1101', 'Kas Tunai',            'asset',   111),
  ('1102', 'Rekening Bank BCA',    'asset',   112),
  ('1103', 'Rekening Bank Mandiri','asset',   113),
  ('1200', 'Piutang',              'asset',   120),
  ('1201', 'Piutang Jamaah',       'asset',   121),
  ('1202', 'Piutang Agen',         'asset',   122),
  ('1300', 'Persediaan',           'asset',   130),
  ('1301', 'Persediaan Perlengkapan','asset', 131),
  -- LIABILITY
  ('2000', 'Kewajiban',            'liability',200),
  ('2100', 'Utang Usaha',          'liability',210),
  ('2101', 'Utang Vendor Airline', 'liability',211),
  ('2102', 'Utang Vendor Hotel',   'liability',212),
  ('2200', 'Utang Gaji',           'liability',220),
  ('2300', 'Titipan Jamaah',       'liability',230),
  -- EQUITY
  ('3000', 'Modal',                'equity',  300),
  ('3100', 'Modal Disetor',        'equity',  310),
  ('3200', 'Laba Ditahan',         'equity',  320),
  -- REVENUE
  ('4000', 'Pendapatan',           'revenue', 400),
  ('4100', 'Pendapatan Paket Umroh','revenue',410),
  ('4101', 'Paket Umroh Reguler',  'revenue', 411),
  ('4102', 'Paket Umroh Plus',     'revenue', 412),
  ('4200', 'Pendapatan Paket Haji','revenue', 420),
  ('4300', 'Pendapatan Lain',      'revenue', 430),
  ('4301', 'Pendapatan Toko',      'revenue', 431),
  -- COGS
  ('5000', 'Harga Pokok',          'cogs',    500),
  ('5100', 'HPP Airline',          'cogs',    510),
  ('5200', 'HPP Hotel',            'cogs',    520),
  ('5300', 'HPP Transport',        'cogs',    530),
  ('5400', 'HPP Visa',             'cogs',    540),
  ('5500', 'HPP Perlengkapan',     'cogs',    550),
  -- EXPENSE
  ('6000', 'Beban Usaha',          'expense', 600),
  ('6100', 'Beban Gaji',           'expense', 610),
  ('6200', 'Beban Marketing',      'expense', 620),
  ('6300', 'Beban Operasional',    'expense', 630),
  ('6400', 'Beban Komisi Agen',    'expense', 640),
  ('6500', 'Beban Admin & Umum',   'expense', 650)
ON CONFLICT (code) DO NOTHING;

-- Set parent_code untuk COA
UPDATE public.chart_of_accounts SET parent_code = '1100' WHERE code IN ('1101','1102','1103');
UPDATE public.chart_of_accounts SET parent_code = '1200' WHERE code IN ('1201','1202');
UPDATE public.chart_of_accounts SET parent_code = '1300' WHERE code IN ('1301');
UPDATE public.chart_of_accounts SET parent_code = '2100' WHERE code IN ('2101','2102');
UPDATE public.chart_of_accounts SET parent_code = '4100' WHERE code IN ('4101','4102');
UPDATE public.chart_of_accounts SET parent_code = '4300' WHERE code IN ('4301');
UPDATE public.chart_of_accounts SET parent_code = '1000' WHERE code IN ('1100','1200','1300');
UPDATE public.chart_of_accounts SET parent_code = '2000' WHERE code IN ('2100','2200','2300');
