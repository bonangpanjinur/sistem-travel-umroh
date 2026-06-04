-- =============================================================================
-- 08_menu_group_reorganization.sql
-- Reorganise menu_items into logical groups aligned with the updated registry.
--
-- Groups BEFORE → Groups AFTER
--   Overview              → Beranda
--   Penjualan (packages)  → Produk & Paket  (packages + package-types split out)
--   Keberangkatan (equip) → Perlengkapan    (equipment items split out)
--   Keuangan (laporan)    → Laporan         (all report items split out)
--   Konten & Marketing    → Konten + Komunikasi (split)
--   Integrasi & Otomasi   → Keuangan (cicilan/VA) + Integrasi (midtrans/api)
--   Dokumen               → Dokumen & Legalitas
--
-- Idempotent — safe to run multiple times.
-- =============================================================================

BEGIN;

-- ── Helper: upsert every canonical item by key ─────────────────────────────
-- Using a single INSERT … ON CONFLICT block per item so this script can also
-- add items that were never seeded in an older database.

-- ── BERANDA (was: Overview) ───────────────────────────────────────────────
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible)
VALUES
  ('dashboard',     'Dashboard',    '/admin',                 'LayoutDashboard', 'Beranda', 101, 'dashboard',     true),
  ('analytics',     'Analytics',    '/admin/analytics',       'BarChart3',       'Beranda', 102, 'analytics',     true),
  ('kpi-dashboard', 'KPI Real-time','/admin/kpi-dashboard',   'Target',          'Beranda', 103, 'kpi-dashboard', true),
  ('ai-summary',    'Ringkasan AI', '/admin/ai-summary',      'Sparkles',        'Beranda', 104, 'ai-summary',    true)
ON CONFLICT (key) DO UPDATE SET
  group_name = EXCLUDED.group_name,
  sort_order = EXCLUDED.sort_order,
  label      = EXCLUDED.label,
  path       = EXCLUDED.path,
  icon       = EXCLUDED.icon,
  is_visible = EXCLUDED.is_visible;

-- ── PENJUALAN (packages & package-types removed, chat-leads moved up) ─────
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible)
VALUES
  ('leads',      'Leads & Prospek',  '/admin/leads',      'UserPlus',     'Penjualan', 201, 'leads',      true),
  ('chat-leads', 'Leads Chat Widget','/admin/chat-leads', 'MessageCircle','Penjualan', 202, 'chat-leads', true),
  ('bookings',   'Booking',          '/admin/bookings',   'BookOpen',     'Penjualan', 203, 'bookings',   true),
  ('coupons',    'Kupon & Promo',    '/admin/coupons',    'Ticket',       'Penjualan', 204, 'coupons',    true)
ON CONFLICT (key) DO UPDATE SET
  group_name = EXCLUDED.group_name,
  sort_order = EXCLUDED.sort_order,
  label      = EXCLUDED.label,
  icon       = EXCLUDED.icon,
  is_visible = EXCLUDED.is_visible;

-- ── PRODUK & PAKET (new group, split from Penjualan) ─────────────────────
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible)
VALUES
  ('packages',      'Paket Umroh & Haji', '/admin/packages',      'Package', 'Produk & Paket', 251, 'packages',      true),
  ('package-types', 'Tipe Paket',         '/admin/package-types', 'Tag',     'Produk & Paket', 252, 'package-types', true)
ON CONFLICT (key) DO UPDATE SET
  group_name = EXCLUDED.group_name,
  sort_order = EXCLUDED.sort_order,
  label      = EXCLUDED.label,
  icon       = EXCLUDED.icon,
  is_visible = EXCLUDED.is_visible;

-- ── KEBERANGKATAN (equipment items moved out) ─────────────────────────────
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible)
VALUES
  ('departures',            'Jadwal Keberangkatan',      '/admin/departures',          'CalendarDays', 'Keberangkatan', 401, 'departures',            true),
  ('departure-tracking',    'Tracking Real-time',        '/admin/departure-tracking',  'Navigation',   'Keberangkatan', 402, 'departure-tracking',    true),
  ('sos-alerts',            'Monitor SOS',               '/admin/sos-alerts',          'AlertCircle',  'Keberangkatan', 403, 'sos-alerts',            true),
  ('room-assignments',      'Kamar & Rooming',           '/admin/room-assignments',    'BedDouble',    'Keberangkatan', 404, 'room-assignments',      true),
  ('manifest-jamaah',       'Manifest Jamaah',           '/admin/manifest',            'FileText',     'Keberangkatan', 405, 'manifest-jamaah',       true),
  ('haji',                  'Manajemen Haji',            '/admin/haji',                'MapPin',       'Keberangkatan', 406, 'haji',                  true),
  ('manasik',               'Manasik',                   '/admin/manasik',             'BookMarked',   'Keberangkatan', 407, 'manasik',               true),
  ('itinerary-templates',   'Template Itinerary',        '/admin/itinerary-templates', 'ListOrdered',  'Keberangkatan', 408, 'itinerary-templates',   true),
  ('absensi-digital',       'Absensi Digital',           '/admin/absensi',             'UserCheck',    'Keberangkatan', 409, 'absensi-digital',       true),
  ('wa-blast-keberangkatan','Broadcast WA Keberangkatan','/admin/wa-blast',            'MessageSquare','Keberangkatan', 410, 'wa-blast-keberangkatan',true),
  ('muthawif-dashboard',    'Dashboard Muthawif',        '/muthawif/dashboard',        'UserCog',      'Keberangkatan', 411, 'muthawif-dashboard',    true)
ON CONFLICT (key) DO UPDATE SET
  group_name = EXCLUDED.group_name,
  sort_order = EXCLUDED.sort_order,
  label      = EXCLUDED.label,
  path       = EXCLUDED.path,
  icon       = EXCLUDED.icon,
  is_visible = EXCLUDED.is_visible;

-- ── PERLENGKAPAN (new group, split from Keberangkatan) ────────────────────
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible)
VALUES
  ('equipment',          'Perlengkapan',         '/admin/equipment',          'Backpack',     'Perlengkapan', 451, 'equipment',          true),
  ('equipment-master',   'Master Perlengkapan',  '/admin/equipment-master',   'PackageOpen',  'Perlengkapan', 452, 'equipment-master',   true),
  ('equipment-settings', 'Setting Perlengkapan', '/admin/equipment-settings', 'Settings2',    'Perlengkapan', 453, 'equipment-settings', true),
  ('stock-opname',       'Stock Opname',         '/admin/stock-opname',       'ClipboardCheck','Perlengkapan',454, 'stock-opname',       true)
ON CONFLICT (key) DO UPDATE SET
  group_name = EXCLUDED.group_name,
  sort_order = EXCLUDED.sort_order,
  label      = EXCLUDED.label,
  icon       = EXCLUDED.icon,
  is_visible = EXCLUDED.is_visible;

-- ── JAMAAH & AGEN ─────────────────────────────────────────────────────────
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible)
VALUES
  ('customers',               'Data Jamaah',         '/admin/customers',               'Users',        'Jamaah & Agen', 601, 'customers',               true),
  ('agents',                  'Agen',                '/admin/agents',                  'UserSquare2',  'Jamaah & Agen', 602, 'agents',                  true),
  ('branches',                'Cabang',              '/admin/branches',                'Network',      'Jamaah & Agen', 603, 'branches',                true),
  ('memberships',             'Keanggotaan',         '/admin/memberships',             'Crown',        'Jamaah & Agen', 604, 'memberships',             true),
  ('loyalty',                 'Program Loyalitas',   '/admin/loyalty',                 'Award',        'Jamaah & Agen', 605, 'loyalty',                 true),
  ('referrals',               'Referral',            '/admin/referrals',               'Share2',       'Jamaah & Agen', 606, 'referrals',               true),
  ('visa',                    'Visa',                '/admin/visa',                    'FileCheck',    'Jamaah & Agen', 607, 'visa',                    true),
  ('branch-commissions',      'Komisi Cabang',       '/admin/branch-commissions',      'DollarSign',   'Jamaah & Agen', 608, 'branch-commissions',      true),
  ('agent-commission-report', 'Laporan Komisi Agen', '/admin/agent-commission-report', 'BarChart3',    'Jamaah & Agen', 609, 'agent-commission-report', true)
ON CONFLICT (key) DO UPDATE SET
  group_name = EXCLUDED.group_name,
  sort_order = EXCLUDED.sort_order,
  label      = EXCLUDED.label,
  icon       = EXCLUDED.icon,
  is_visible = EXCLUDED.is_visible;

-- ── KEUANGAN (report items moved out, cicilan/VA added) ───────────────────
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible)
VALUES
  ('finance-terpadu',  'Dashboard Keuangan', '/admin/finance-terpadu',      'Layers',          'Keuangan', 501, 'finance-terpadu',  true),
  ('payments',         'Pembayaran',         '/admin/payments',             'CreditCard',      'Keuangan', 502, 'payments',         true),
  ('refunds',          'Monitor Refund',     '/admin/refunds',              'RotateCcw',       'Keuangan', 503, 'refunds',          true),
  ('finance-cash',     'Kas & Bank',         '/admin/finance-cash',         'Coins',           'Keuangan', 504, 'finance-cash',     true),
  ('finance-ar',       'Piutang (AR)',        '/admin/finance/ar',           'ArrowDownToLine', 'Keuangan', 505, 'finance-ar',       true),
  ('finance-ap',       'Hutang (AP)',         '/admin/finance/ap',           'ArrowUpFromLine', 'Keuangan', 506, 'finance-ap',       true),
  ('savings',          'Program Tabungan',   '/admin/savings',              'PiggyBank',       'Keuangan', 507, 'savings',          true),
  ('virtual-account',  'Virtual Account',    '/admin/virtual-account',      'Landmark',        'Keuangan', 508, 'virtual-account',  true),
  ('cicilan-reminder', 'Reminder Cicilan',   '/admin/cicilan-reminder',     'BellRing',        'Keuangan', 509, 'cicilan-reminder', true),
  ('cicilan-generator','Generator Cicilan',  '/admin/cicilan-generator',    'CalendarRange',   'Keuangan', 510, 'cicilan-generator',true),
  ('wa-blast-tagihan', 'WA Blast Tagihan',   '/admin/wa-blast-tagihan',     'Wallet',          'Keuangan', 511, 'wa-blast-tagihan', true)
ON CONFLICT (key) DO UPDATE SET
  group_name = EXCLUDED.group_name,
  sort_order = EXCLUDED.sort_order,
  label      = EXCLUDED.label,
  icon       = EXCLUDED.icon,
  is_visible = EXCLUDED.is_visible;

-- ── LAPORAN (new group, split from Keuangan) ──────────────────────────────
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible)
VALUES
  ('finance',               'Laporan P&L',            '/admin/finance',                 'TrendingUp',   'Laporan', 521, 'finance',               true),
  ('reports-central',       'Laporan Terpusat',        '/admin/reports-central',         'FileBarChart', 'Laporan', 522, 'reports',               true),
  ('reports',               'Laporan Detail',          '/admin/reports',                 'BarChart',     'Laporan', 523, 'reports',               true),
  ('advanced-reports',      'Laporan Lanjutan',        '/admin/advanced-reports',        'ChartLine',    'Laporan', 524, 'advanced-reports',      true),
  ('scheduled-reports',     'Laporan Terjadwal',       '/admin/scheduled-reports',       'CalendarClock','Laporan', 525, 'scheduled-reports',     true),
  ('laporan-keuangan',      'Laporan Keuangan',        '/admin/laporan/keuangan',        'BarChart3',    'Laporan', 526, 'laporan-keuangan',      true),
  ('laporan-keberangkatan', 'Laporan Keberangkatan',   '/admin/laporan/keberangkatan',   'Plane',        'Laporan', 527, 'laporan-keberangkatan', true),
  ('laporan-agen',          'Performa Agen',           '/admin/laporan/agen',            'Trophy',       'Laporan', 528, 'laporan-agen',          true),
  ('monitoring-tabungan',   'Monitoring Tabungan',     '/admin/laporan/tabungan',        'PiggyBank',    'Laporan', 529, 'monitoring-tabungan',   true)
ON CONFLICT (key) DO UPDATE SET
  group_name = EXCLUDED.group_name,
  sort_order = EXCLUDED.sort_order,
  label      = EXCLUDED.label,
  path       = EXCLUDED.path,
  icon       = EXCLUDED.icon,
  is_visible = EXCLUDED.is_visible;

-- ── KONTEN (split from Konten & Marketing) ────────────────────────────────
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible)
VALUES
  ('blog',          'Blog & Artikel',  '/admin/blog',          'BookOpen',  'Konten', 301, 'blog',          true),
  ('announcements', 'Pengumuman',      '/admin/announcements', 'Megaphone', 'Konten', 302, 'announcements', true),
  ('banners',       'Banner Carousel', '/admin/banners',       'Image',     'Konten', 303, 'banners',       true),
  ('landing-pages', 'Landing Page',    '/admin/landing-pages', 'Globe',     'Konten', 304, 'landing-pages', true),
  ('faq-manager',   'FAQ Manager',     '/admin/faq-manager',   'HelpCircle','Konten', 305, 'faq-manager',   true)
ON CONFLICT (key) DO UPDATE SET
  group_name = EXCLUDED.group_name,
  sort_order = EXCLUDED.sort_order,
  label      = EXCLUDED.label,
  icon       = EXCLUDED.icon,
  is_visible = EXCLUDED.is_visible;

-- ── KOMUNIKASI (split from Konten & Marketing + Integrasi & Otomasi) ──────
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible)
VALUES
  ('marketing-materials','Materi Marketing', '/admin/marketing-materials', 'Radio',            'Komunikasi', 311, 'marketing-materials', true),
  ('whatsapp',           'WhatsApp Blast',   '/admin/whatsapp',            'MessageSquare',    'Komunikasi', 312, 'whatsapp',            true),
  ('wa-otomatis',        'WA Otomatis',      '/admin/wa-otomatis',         'MessageSquareDot', 'Komunikasi', 313, 'wa-otomatis',         true),
  ('email-templates',    'Template Email',   '/admin/email-templates',     'Mail',             'Komunikasi', 314, 'email-templates',     true),
  ('push-notifications', 'Push Notifikasi',  '/admin/push-notifications',  'Bell',             'Komunikasi', 315, 'push-notifications',  true)
ON CONFLICT (key) DO UPDATE SET
  group_name = EXCLUDED.group_name,
  sort_order = EXCLUDED.sort_order,
  label      = EXCLUDED.label,
  icon       = EXCLUDED.icon,
  is_visible = EXCLUDED.is_visible;

-- ── AI & ANALYTICS ────────────────────────────────────────────────────────
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible)
VALUES
  ('gemini-ai',         'Gemini AI Chatbot',   '/admin/gemini-ai',         'Sparkles',     'AI & Analytics', 561, 'gemini-ai',         true),
  ('chatbot-stats',     'Statistik Chatbot',   '/admin/chatbot-stats',     'BarChart3',    'AI & Analytics', 562, 'gemini-ai',         true),
  ('chat-logs',         'Log Percakapan',      '/admin/chat-logs',         'ScrollText',   'AI & Analytics', 563, 'gemini-ai',         true),
  ('sentimen-feedback', 'Analisis Sentimen',   '/admin/sentimen-feedback', 'Smile',        'AI & Analytics', 564, 'sentimen-feedback', true),
  ('prediksi-seat',     'Prediksi Seat',       '/admin/prediksi-seat',     'TrendingUp',   'AI & Analytics', 565, 'prediksi-seat',     true),
  ('smart-notif',       'Smart Notifikasi',    '/admin/smart-notif',       'BrainCircuit', 'AI & Analytics', 566, 'smart-notif',       true),
  ('rekomendasi-paket', 'Rekomendasi Paket AI','/admin/rekomendasi-paket', 'Sparkles',     'AI & Analytics', 567, 'rekomendasi-paket', true)
ON CONFLICT (key) DO UPDATE SET
  group_name = EXCLUDED.group_name,
  sort_order = EXCLUDED.sort_order,
  label      = EXCLUDED.label,
  icon       = EXCLUDED.icon,
  is_visible = EXCLUDED.is_visible;

-- ── DOKUMEN & LEGALITAS (was: Dokumen) ────────────────────────────────────
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible)
VALUES
  ('document-verification',   'Verifikasi Dokumen',     '/admin/document-verification',   'FileSearch',    'Dokumen & Legalitas', 801, 'document-verification',   true),
  ('document-types',          'Jenis Dokumen',          '/admin/document-types',          'FileCog',       'Dokumen & Legalitas', 802, 'document-types',          true),
  ('documents-generator',     'Generator Surat',        '/admin/documents-generator',     'FileText',      'Dokumen & Legalitas', 803, 'documents-generator',     true),
  ('proposal-generator',      'Generator Proposal',     '/admin/proposal-generator',      'FileOutput',    'Dokumen & Legalitas', 804, 'proposal-generator',      true),
  ('document-expiry-tracker', 'Tracker Dokumen Jamaah', '/admin/document-expiry-tracker', 'ShieldAlert',   'Dokumen & Legalitas', 805, 'document-expiry-tracker', true),
  ('correspondence',          'Hub Korespondensi',      '/admin/correspondence',          'MessagesSquare','Dokumen & Legalitas', 806, 'whatsapp',                true),
  ('offline-content',         'Konten Offline',         '/admin/offline-content',         'WifiOff',       'Dokumen & Legalitas', 807, 'offline-content',         true),
  ('support',                 'Tiket Support',          '/admin/support',                 'LifeBuoy',      'Dokumen & Legalitas', 808, 'support',                 true),
  ('cancellation-policies',   'Aturan Pembatalan',      '/admin/cancellation-policies',   'ClipboardList', 'Dokumen & Legalitas', 809, 'cancellation-policies',   true),
  ('office-assets',           'Aset Kantor',            '/admin/office-assets',           'Briefcase',     'Dokumen & Legalitas', 810, 'office-assets',           true)
ON CONFLICT (key) DO UPDATE SET
  group_name = EXCLUDED.group_name,
  sort_order = EXCLUDED.sort_order,
  label      = EXCLUDED.label,
  icon       = EXCLUDED.icon,
  is_visible = EXCLUDED.is_visible;

-- ── SDM ───────────────────────────────────────────────────────────────────
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible)
VALUES
  ('hr',      'SDM / HR',   '/admin/hr',          'UserCog', 'SDM', 701, 'hr',      true),
  ('payroll', 'Penggajian', '/admin/hr/payroll',  'Wallet',  'SDM', 702, 'payroll', true)
ON CONFLICT (key) DO UPDATE SET
  group_name = EXCLUDED.group_name,
  sort_order = EXCLUDED.sort_order,
  label      = EXCLUDED.label,
  icon       = EXCLUDED.icon,
  is_visible = EXCLUDED.is_visible;

-- ── MASTER DATA ───────────────────────────────────────────────────────────
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible)
VALUES
  ('hotels',       'Hotel',                '/admin/hotels',        'Hotel',          'Master Data', 901, 'hotels',       true),
  ('airlines',     'Maskapai',             '/admin/airlines',      'Plane',          'Master Data', 902, 'airlines',     true),
  ('airports',     'Bandara',              '/admin/airports',      'Building',       'Master Data', 903, 'airports',     true),
  ('vendors',      'Vendor',              '/admin/vendors',        'Store',          'Master Data', 904, 'vendors',      true),
  ('muthawifs',    'Muthawif',            '/admin/muthawifs',      'PersonStanding', 'Master Data', 905, 'muthawifs',    true),
  ('bus-providers','Penyedia Bus',        '/admin/bus-providers',  'Bus',            'Master Data', 906, 'bus-providers',true),
  ('master-data',  'Master Data Lainnya', '/admin/master-data',   'Database',       'Master Data', 907, 'master-data',  true)
ON CONFLICT (key) DO UPDATE SET
  group_name = EXCLUDED.group_name,
  sort_order = EXCLUDED.sort_order,
  label      = EXCLUDED.label,
  icon       = EXCLUDED.icon,
  is_visible = EXCLUDED.is_visible;

-- ── INTEGRASI (was: Integrasi & Otomasi, trimmed) ────────────────────────
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible)
VALUES
  ('midtrans',    'Midtrans Payment', '/admin/midtrans',    'CreditCard', 'Integrasi', 551, 'midtrans',    true),
  ('api-connect', 'Integrasi & API',  '/admin/api-connect', 'Plug',       'Integrasi', 552, 'api-connect', true)
ON CONFLICT (key) DO UPDATE SET
  group_name = EXCLUDED.group_name,
  sort_order = EXCLUDED.sort_order,
  label      = EXCLUDED.label,
  icon       = EXCLUDED.icon,
  is_visible = EXCLUDED.is_visible;

-- ── PENGATURAN ────────────────────────────────────────────────────────────
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible)
VALUES
  ('settings',       'Pengaturan Umum',    '/admin/settings',      'Settings',   'Pengaturan', 1001, 'settings',       true),
  ('appearance',     'Tampilan & Branding','/admin/appearance',     'Palette',    'Pengaturan', 1002, 'appearance',     true),
  ('pdf-layout',     'Layout Dokumen PDF', '/admin/pdf-layout',     'FileText',   'Pengaturan', 1003, 'appearance',     true),
  ('users',          'Hak Akses (RBAC)',   '/admin/users',          'ShieldCheck','Pengaturan', 1004, 'users',          true),
  ('2fa',            'Keamanan',           '/admin/2fa',            'Shield',     'Pengaturan', 1005, '2fa',            true),
  ('supabase-setup', 'Panduan Backend',    '/admin/supabase-setup', 'Database',   'Pengaturan', 1006, 'supabase-setup', true)
ON CONFLICT (key) DO UPDATE SET
  group_name = EXCLUDED.group_name,
  sort_order = EXCLUDED.sort_order,
  label      = EXCLUDED.label,
  icon       = EXCLUDED.icon,
  is_visible = EXCLUDED.is_visible;

-- ── Profitabilitas Paket (added in migration 07, ensure correct group) ────
UPDATE menu_items
SET group_name = 'Laporan', sort_order = 530
WHERE key = 'profitabilitas-paket';

-- ── Hide legacy items that no longer have a first-class route ────────────
-- These remain in the DB but won't appear in the sidebar.
UPDATE menu_items
SET is_visible = false
WHERE key IN (
  'package-profitability-comparison'  -- superseded by profitabilitas-paket
);

COMMIT;

SELECT
  group_name,
  COUNT(*) AS item_count
FROM menu_items
WHERE is_visible = true
GROUP BY group_name
ORDER BY MIN(sort_order);
