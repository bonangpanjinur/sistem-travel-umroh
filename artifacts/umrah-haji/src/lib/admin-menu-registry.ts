/**
 * Canonical admin menu registry.
 *
 * Groups (in display order):
 *   Beranda · Penjualan · Produk & Paket · Keberangkatan · Perlengkapan
 *   Jamaah & Agen · Keuangan · Laporan · Konten · Komunikasi
 *   AI & Analytics · Dokumen & Legalitas · SDM · Master Data · Integrasi · Pengaturan
 *
 * Sort order uses 100-based offsets per group to guarantee correct group ordering.
 * Super-admin always receives every item regardless of DB state.
 */

import { PERMISSIONS } from './permissions';

export interface AdminMenuItem {
  key: string;
  label: string;
  path: string;
  icon: string;
  group_name: string;
  sort_order: number;
  required_permission: string;
}

export const RECOMMENDED_MENUS: AdminMenuItem[] = [
  // ── Beranda (100s) ───────────────────────────────────────────────────────
  { key: 'dashboard',           label: 'Dashboard',             path: '/admin',                      icon: 'LayoutDashboard', group_name: 'Beranda',            sort_order: 101, required_permission: PERMISSIONS.DASHBOARD },
  { key: 'analytics',           label: 'Analytics',             path: '/admin/analytics',            icon: 'BarChart3',       group_name: 'Beranda',            sort_order: 102, required_permission: PERMISSIONS.ANALYTICS },
  { key: 'kpi-dashboard',       label: 'KPI Real-time',         path: '/admin/kpi-dashboard',        icon: 'Target',          group_name: 'Beranda',            sort_order: 103, required_permission: PERMISSIONS.KPI_DASHBOARD },
  { key: 'ai-summary',          label: 'Ringkasan AI',          path: '/admin/ai-summary',           icon: 'Sparkles',        group_name: 'Beranda',            sort_order: 104, required_permission: PERMISSIONS.AI_SUMMARY },

  // ── Penjualan (200s) ─────────────────────────────────────────────────────
  { key: 'leads',               label: 'Leads & Prospek',       path: '/admin/leads',                icon: 'UserPlus',        group_name: 'Penjualan',          sort_order: 201, required_permission: PERMISSIONS.LEADS },
  { key: 'chat-leads',          label: 'Leads Chat Widget',     path: '/admin/chat-leads',           icon: 'MessageCircle',   group_name: 'Penjualan',          sort_order: 202, required_permission: PERMISSIONS.CHAT_LEADS },
  { key: 'bookings',            label: 'Booking',               path: '/admin/bookings',             icon: 'BookOpen',        group_name: 'Penjualan',          sort_order: 203, required_permission: PERMISSIONS.BOOKINGS },
  { key: 'coupons',             label: 'Kupon & Promo',         path: '/admin/coupons',              icon: 'Ticket',          group_name: 'Penjualan',          sort_order: 204, required_permission: PERMISSIONS.COUPONS },

  // ── Operasional (250s) — Paket · Keberangkatan · Perlengkapan ────────────
  { key: 'packages',            label: 'Paket Umroh & Haji',    path: '/admin/packages',             icon: 'Package',         group_name: 'Operasional',        sort_order: 251, required_permission: PERMISSIONS.PACKAGES },
  { key: 'package-types',       label: 'Tipe Paket',            path: '/admin/package-types',        icon: 'Tag',             group_name: 'Operasional',        sort_order: 252, required_permission: PERMISSIONS.PACKAGE_TYPES },
  { key: 'departures',          label: 'Jadwal Keberangkatan',  path: '/admin/departures',           icon: 'CalendarDays',    group_name: 'Operasional',        sort_order: 261, required_permission: PERMISSIONS.DEPARTURES },
  { key: 'room-assignments',    label: 'Kamar & Rooming',       path: '/admin/room-assignments',     icon: 'BedDouble',       group_name: 'Operasional',        sort_order: 262, required_permission: PERMISSIONS.ROOM_ASSIGNMENTS },
  { key: 'manifest-jamaah',     label: 'Manifest Jamaah',       path: '/admin/manifest',             icon: 'FileText',        group_name: 'Operasional',        sort_order: 263, required_permission: PERMISSIONS.MANIFEST_JAMAAH },
  { key: 'equipment',           label: 'Perlengkapan',          path: '/admin/equipment',            icon: 'Backpack',        group_name: 'Operasional',        sort_order: 264, required_permission: PERMISSIONS.EQUIPMENT },
  { key: 'haji',                label: 'Manajemen Haji',        path: '/admin/haji',                 icon: 'MapPin',          group_name: 'Operasional',        sort_order: 266, required_permission: PERMISSIONS.HAJI },
  { key: 'manasik',             label: 'Manasik',               path: '/admin/manasik',              icon: 'BookMarked',      group_name: 'Operasional',        sort_order: 267, required_permission: PERMISSIONS.MANASIK },
  { key: 'absensi-digital',     label: 'Absensi Digital',       path: '/admin/absensi',              icon: 'UserCheck',       group_name: 'Operasional',        sort_order: 268, required_permission: PERMISSIONS.ABSENSI_DIGITAL },
  { key: 'departure-tracking',  label: 'Tracking Real-time',    path: '/admin/departure-tracking',   icon: 'Navigation',      group_name: 'Operasional',        sort_order: 269, required_permission: PERMISSIONS.DEPARTURE_TRACKING },
  { key: 'muthawif-dashboard',  label: 'Dashboard Muthawif',    path: '/muthawif/dashboard',         icon: 'UserCog',         group_name: 'Operasional',        sort_order: 270, required_permission: PERMISSIONS.MUTHAWIF_DASHBOARD },
  { key: 'itinerary-templates', label: 'Template Itinerary',    path: '/admin/itinerary-templates',  icon: 'ListOrdered',     group_name: 'Operasional',        sort_order: 271, required_permission: PERMISSIONS.ITINERARY_TEMPLATES },
  { key: 'sos-alerts',          label: 'Monitor SOS',           path: '/admin/sos-alerts',           icon: 'AlertCircle',     group_name: 'Operasional',        sort_order: 272, required_permission: PERMISSIONS.SOS_ALERTS },
  { key: 'equipment-settings',  label: 'Setting Perlengkapan',  path: '/admin/equipment-settings',   icon: 'Settings2',       group_name: 'Operasional',        sort_order: 273, required_permission: PERMISSIONS.EQUIPMENT_SETTINGS },
  { key: 'wa-blast-keberangkatan', label: 'Broadcast WA Keberangkatan', path: '/admin/wa-blast',   icon: 'MessageSquare',   group_name: 'Operasional',        sort_order: 275, required_permission: PERMISSIONS.WA_BLAST_KEBERANGKATAN },

  // ── Jamaah & Agen (600s) ──────────────────────────────────────────────────
  { key: 'customers',           label: 'Data Jamaah',           path: '/admin/customers',            icon: 'Users',           group_name: 'Jamaah & Agen',      sort_order: 601, required_permission: PERMISSIONS.CUSTOMERS },
  { key: 'agents',              label: 'Agen',                  path: '/admin/agents',               icon: 'UserSquare2',     group_name: 'Jamaah & Agen',      sort_order: 602, required_permission: PERMISSIONS.AGENTS },
  { key: 'branches',            label: 'Cabang',                path: '/admin/branches',             icon: 'Network',         group_name: 'Jamaah & Agen',      sort_order: 603, required_permission: PERMISSIONS.BRANCHES },
  { key: 'memberships',         label: 'Keanggotaan',           path: '/admin/memberships',          icon: 'Crown',           group_name: 'Jamaah & Agen',      sort_order: 604, required_permission: PERMISSIONS.MEMBERSHIPS },
  { key: 'loyalty',             label: 'Program Loyalitas',     path: '/admin/loyalty',              icon: 'Award',           group_name: 'Jamaah & Agen',      sort_order: 605, required_permission: PERMISSIONS.LOYALTY },
  { key: 'referrals',           label: 'Referral',              path: '/admin/referrals',            icon: 'Share2',          group_name: 'Jamaah & Agen',      sort_order: 606, required_permission: PERMISSIONS.REFERRALS },
  { key: 'visa',                label: 'Visa',                  path: '/admin/visa',                 icon: 'FileCheck',       group_name: 'Jamaah & Agen',      sort_order: 607, required_permission: PERMISSIONS.VISA },
  { key: 'branch-commissions',      label: 'Komisi Cabang',       path: '/admin/branch-commissions',       icon: 'DollarSign',  group_name: 'Jamaah & Agen',      sort_order: 608, required_permission: PERMISSIONS.BRANCH_COMMISSIONS },
  { key: 'agent-commission-report', label: 'Laporan Komisi Agen', path: '/admin/agent-commission-report',  icon: 'BarChart3',   group_name: 'Jamaah & Agen',      sort_order: 609, required_permission: PERMISSIONS.AGENT_COMMISSION_REPORT },

  // ── Keuangan (500s) ───────────────────────────────────────────────────────
  { key: 'finance-terpadu',     label: 'Dashboard Keuangan',    path: '/admin/finance-terpadu',      icon: 'Layers',          group_name: 'Keuangan',           sort_order: 501, required_permission: PERMISSIONS.FINANCE_TERPADU },
  { key: 'payments',            label: 'Pembayaran',            path: '/admin/payments',             icon: 'CreditCard',      group_name: 'Keuangan',           sort_order: 502, required_permission: PERMISSIONS.PAYMENTS },
  { key: 'refunds',             label: 'Monitor Refund',        path: '/admin/refunds',              icon: 'RotateCcw',       group_name: 'Keuangan',           sort_order: 503, required_permission: PERMISSIONS.REFUNDS },
  { key: 'finance-cash',        label: 'Kas & Bank',            path: '/admin/finance-cash',         icon: 'Coins',           group_name: 'Keuangan',           sort_order: 504, required_permission: PERMISSIONS.FINANCE_CASH },
  { key: 'finance-ar',          label: 'Piutang (AR)',          path: '/admin/finance/ar',           icon: 'ArrowDownToLine', group_name: 'Keuangan',           sort_order: 505, required_permission: PERMISSIONS.FINANCE_AR },
  { key: 'finance-ap',          label: 'Hutang (AP)',           path: '/admin/finance/ap',           icon: 'ArrowUpFromLine', group_name: 'Keuangan',           sort_order: 506, required_permission: PERMISSIONS.FINANCE_AP },
  { key: 'savings',             label: 'Program Tabungan',      path: '/admin/savings',              icon: 'PiggyBank',       group_name: 'Keuangan',           sort_order: 507, required_permission: PERMISSIONS.SAVINGS },
  { key: 'virtual-account',     label: 'Virtual Account',       path: '/admin/virtual-account',      icon: 'Landmark',        group_name: 'Keuangan',           sort_order: 508, required_permission: PERMISSIONS.VIRTUAL_ACCOUNT },
  { key: 'cicilan-reminder',    label: 'Reminder Cicilan',      path: '/admin/cicilan-reminder',     icon: 'BellRing',        group_name: 'Keuangan',           sort_order: 509, required_permission: PERMISSIONS.CICILAN_REMINDER },
  { key: 'cicilan-generator',   label: 'Generator Cicilan',     path: '/admin/cicilan-generator',    icon: 'CalendarRange',   group_name: 'Keuangan',           sort_order: 510, required_permission: PERMISSIONS.CICILAN_GENERATOR },
  { key: 'wa-blast-tagihan',    label: 'WA Blast Tagihan',      path: '/admin/wa-blast-tagihan',     icon: 'Wallet',          group_name: 'Keuangan',           sort_order: 511, required_permission: PERMISSIONS.WA_BLAST_TAGIHAN },

  // ── Laporan (520s) ────────────────────────────────────────────────────────
  { key: 'finance',             label: 'Laporan P&L',           path: '/admin/finance',              icon: 'TrendingUp',      group_name: 'Laporan',            sort_order: 521, required_permission: PERMISSIONS.FINANCE },
  { key: 'reports-central',     label: 'Laporan Terpusat',      path: '/admin/reports-central',      icon: 'FileBarChart',    group_name: 'Laporan',            sort_order: 522, required_permission: PERMISSIONS.REPORTS },
  { key: 'reports',             label: 'Laporan Detail',        path: '/admin/reports',              icon: 'BarChart',        group_name: 'Laporan',            sort_order: 523, required_permission: PERMISSIONS.REPORTS },
  { key: 'advanced-reports',    label: 'Laporan Lanjutan',      path: '/admin/advanced-reports',     icon: 'ChartLine',       group_name: 'Laporan',            sort_order: 524, required_permission: PERMISSIONS.ADVANCED_REPORTS },
  { key: 'scheduled-reports',   label: 'Laporan Terjadwal',     path: '/admin/scheduled-reports',    icon: 'CalendarClock',   group_name: 'Laporan',            sort_order: 525, required_permission: PERMISSIONS.SCHEDULED_REPORTS },
  { key: 'laporan-keuangan',    label: 'Laporan Keuangan',      path: '/admin/laporan/keuangan',     icon: 'BarChart3',       group_name: 'Laporan',            sort_order: 526, required_permission: PERMISSIONS.LAPORAN_KEUANGAN },
  { key: 'laporan-keberangkatan', label: 'Laporan Keberangkatan', path: '/admin/laporan/keberangkatan', icon: 'Plane',        group_name: 'Laporan',            sort_order: 527, required_permission: PERMISSIONS.LAPORAN_KEBERANGKATAN },
  { key: 'laporan-agen',        label: 'Performa Agen',         path: '/admin/laporan/agen',         icon: 'Trophy',          group_name: 'Laporan',            sort_order: 528, required_permission: PERMISSIONS.LAPORAN_AGEN },
  { key: 'monitoring-tabungan', label: 'Monitoring Tabungan',   path: '/admin/laporan/tabungan',     icon: 'PiggyBank',       group_name: 'Laporan',            sort_order: 529, required_permission: PERMISSIONS.MONITORING_TABUNGAN },
  { key: 'laporan-reminder',    label: 'Laporan Reminder',      path: '/admin/laporan/reminder',     icon: 'BellRing',        group_name: 'Laporan',            sort_order: 530, required_permission: PERMISSIONS.LAPORAN_REMINDER },

  // ── Konten (300s) ─────────────────────────────────────────────────────────
  { key: 'blog',                label: 'Blog & Artikel',        path: '/admin/blog',                 icon: 'BookOpen',        group_name: 'Konten',             sort_order: 301, required_permission: PERMISSIONS.BLOG },
  { key: 'announcements',       label: 'Pengumuman',            path: '/admin/announcements',        icon: 'Megaphone',       group_name: 'Konten',             sort_order: 302, required_permission: PERMISSIONS.ANNOUNCEMENTS },
  { key: 'banners',             label: 'Banner Carousel',       path: '/admin/banners',              icon: 'Image',           group_name: 'Konten',             sort_order: 303, required_permission: PERMISSIONS.BANNERS },
  { key: 'landing-pages',       label: 'Landing Page',          path: '/admin/landing-pages',        icon: 'Globe',           group_name: 'Konten',             sort_order: 304, required_permission: PERMISSIONS.LANDING_PAGES },
  { key: 'faq-manager',         label: 'FAQ Manager',           path: '/admin/faq-manager',          icon: 'HelpCircle',      group_name: 'Konten',             sort_order: 305, required_permission: PERMISSIONS.FAQ_MANAGER },

  // ── Komunikasi (310s) ─────────────────────────────────────────────────────
  { key: 'marketing-materials', label: 'Materi Marketing',      path: '/admin/marketing-materials',  icon: 'Radio',           group_name: 'Komunikasi',         sort_order: 311, required_permission: PERMISSIONS.MARKETING_MATERIALS },
  { key: 'whatsapp',            label: 'WhatsApp Blast',        path: '/admin/whatsapp',             icon: 'MessageSquare',   group_name: 'Komunikasi',         sort_order: 312, required_permission: PERMISSIONS.WHATSAPP },
  { key: 'wa-otomatis',         label: 'WA Otomatis',           path: '/admin/wa-otomatis',          icon: 'MessageSquareDot', group_name: 'Komunikasi',        sort_order: 313, required_permission: PERMISSIONS.WA_OTOMATIS },
  { key: 'wa-provider',         label: 'Konfigurasi Provider WA', path: '/admin/wa-provider',        icon: 'Settings2',       group_name: 'Komunikasi',         sort_order: 316, required_permission: PERMISSIONS.WA_PROVIDER },
  { key: 'wa-roadmap',          label: 'Roadmap WA',            path: '/admin/wa-roadmap',           icon: 'Map',             group_name: 'Komunikasi',         sort_order: 317, required_permission: PERMISSIONS.WA_ROADMAP },
  { key: 'email-templates',     label: 'Template Email',        path: '/admin/email-templates',      icon: 'Mail',            group_name: 'Komunikasi',         sort_order: 314, required_permission: PERMISSIONS.EMAIL_TEMPLATES },
  { key: 'push-notifications',  label: 'Push Notifikasi',       path: '/admin/push-notifications',   icon: 'Bell',            group_name: 'Komunikasi',         sort_order: 315, required_permission: PERMISSIONS.PUSH_NOTIFICATIONS },

  // ── AI & Analytics (560s) ────────────────────────────────────────────────
  { key: 'gemini-ai',           label: 'Gemini AI Chatbot',     path: '/admin/gemini-ai',            icon: 'Sparkles',        group_name: 'AI & Analytics',     sort_order: 561, required_permission: PERMISSIONS.GEMINI_AI },
  { key: 'chatbot-stats',       label: 'Statistik Chatbot',     path: '/admin/chatbot-stats',        icon: 'BarChart3',       group_name: 'AI & Analytics',     sort_order: 562, required_permission: PERMISSIONS.GEMINI_AI },
  { key: 'chat-logs',           label: 'Log Percakapan',        path: '/admin/chat-logs',            icon: 'ScrollText',      group_name: 'AI & Analytics',     sort_order: 563, required_permission: PERMISSIONS.GEMINI_AI },
  { key: 'sentimen-feedback',   label: 'Analisis Sentimen',     path: '/admin/sentimen-feedback',    icon: 'Smile',           group_name: 'AI & Analytics',     sort_order: 564, required_permission: PERMISSIONS.SENTIMEN_FEEDBACK },
  { key: 'prediksi-seat',       label: 'Prediksi Seat',         path: '/admin/prediksi-seat',        icon: 'TrendingUp',      group_name: 'AI & Analytics',     sort_order: 565, required_permission: PERMISSIONS.PREDIKSI_SEAT },
  { key: 'smart-notif',         label: 'Smart Notifikasi',      path: '/admin/smart-notif',          icon: 'BrainCircuit',    group_name: 'AI & Analytics',     sort_order: 566, required_permission: PERMISSIONS.SMART_NOTIF },
  { key: 'rekomendasi-paket',   label: 'Rekomendasi Paket AI',  path: '/admin/rekomendasi-paket',    icon: 'Sparkles',        group_name: 'AI & Analytics',     sort_order: 567, required_permission: PERMISSIONS.REKOMENDASI_PAKET },

  // ── Dokumen & Legalitas (800s) ────────────────────────────────────────────
  { key: 'document-verification',  label: 'Verifikasi Dokumen',    path: '/admin/document-verification',  icon: 'FileSearch',    group_name: 'Dokumen & Legalitas', sort_order: 801, required_permission: PERMISSIONS.DOCUMENT_VERIFICATION },
  { key: 'document-types',         label: 'Jenis Dokumen',         path: '/admin/document-types',         icon: 'FileCog',       group_name: 'Dokumen & Legalitas', sort_order: 802, required_permission: PERMISSIONS.DOCUMENT_TYPES },
  { key: 'documents-generator',    label: 'Generator Surat',       path: '/admin/documents-generator',    icon: 'FileText',      group_name: 'Dokumen & Legalitas', sort_order: 803, required_permission: PERMISSIONS.DOCUMENTS_GENERATOR },
  { key: 'proposal-generator',     label: 'Generator Proposal',    path: '/admin/proposal-generator',     icon: 'FileOutput',    group_name: 'Dokumen & Legalitas', sort_order: 804, required_permission: PERMISSIONS.PROPOSAL_GENERATOR },
  { key: 'document-expiry-tracker',label: 'Tracker Dokumen Jamaah',path: '/admin/document-expiry-tracker',icon: 'ShieldAlert',   group_name: 'Dokumen & Legalitas', sort_order: 805, required_permission: PERMISSIONS.DOCUMENT_EXPIRY_TRACKER },
  { key: 'correspondence',         label: 'Hub Korespondensi',     path: '/admin/correspondence',         icon: 'MessagesSquare',group_name: 'Dokumen & Legalitas', sort_order: 806, required_permission: PERMISSIONS.WHATSAPP },
  { key: 'offline-content',        label: 'Konten Offline',        path: '/admin/offline-content',        icon: 'WifiOff',       group_name: 'Dokumen & Legalitas', sort_order: 807, required_permission: PERMISSIONS.OFFLINE_CONTENT },
  { key: 'support',                label: 'Tiket Support',         path: '/admin/support',                icon: 'LifeBuoy',      group_name: 'Dokumen & Legalitas', sort_order: 808, required_permission: PERMISSIONS.SUPPORT },
  { key: 'aturan-pembatalan',       label: 'Aturan Pembatalan',     path: '/admin/aturan-pembatalan',       icon: 'ClipboardList', group_name: 'Dokumen & Legalitas', sort_order: 809 },
  { key: 'office-assets',          label: 'Aset Kantor',           path: '/admin/office-assets',          icon: 'Briefcase',     group_name: 'Dokumen & Legalitas', sort_order: 810, required_permission: PERMISSIONS.OFFICE_ASSETS },

  // ── SDM (700s) ────────────────────────────────────────────────────────────
  { key: 'hr',                  label: 'SDM / HR',              path: '/admin/hr',                   icon: 'UserCog',         group_name: 'SDM',                sort_order: 701, required_permission: PERMISSIONS.HR },
  { key: 'payroll',             label: 'Penggajian',            path: '/admin/hr/payroll',           icon: 'Wallet',          group_name: 'SDM',                sort_order: 702, required_permission: PERMISSIONS.PAYROLL },

  // ── Master Data (900s) ────────────────────────────────────────────────────
  { key: 'hotels',              label: 'Hotel',                 path: '/admin/hotels',               icon: 'Hotel',           group_name: 'Master Data',        sort_order: 901, required_permission: PERMISSIONS.HOTELS },
  { key: 'airlines',            label: 'Maskapai',              path: '/admin/airlines',             icon: 'Plane',           group_name: 'Master Data',        sort_order: 902, required_permission: PERMISSIONS.AIRLINES },
  { key: 'airports',            label: 'Bandara',               path: '/admin/airports',             icon: 'Building',        group_name: 'Master Data',        sort_order: 903, required_permission: PERMISSIONS.AIRPORTS },
  { key: 'vendors',             label: 'Vendor',                path: '/admin/vendors',              icon: 'Store',           group_name: 'Master Data',        sort_order: 904, required_permission: PERMISSIONS.VENDORS },
  { key: 'muthawifs',           label: 'Muthawif',              path: '/admin/muthawifs',            icon: 'PersonStanding',  group_name: 'Master Data',        sort_order: 905, required_permission: PERMISSIONS.MUTHAWIFS },
  { key: 'bus-providers',       label: 'Penyedia Bus',          path: '/admin/bus-providers',        icon: 'Bus',             group_name: 'Master Data',        sort_order: 906, required_permission: PERMISSIONS.BUS_PROVIDERS },
  { key: 'master-data',         label: 'Master Data Lainnya',   path: '/admin/master-data',          icon: 'Database',        group_name: 'Master Data',        sort_order: 907, required_permission: PERMISSIONS.MASTER_DATA },

  // ── Integrasi (550s) ──────────────────────────────────────────────────────
  { key: 'midtrans',            label: 'Midtrans Payment',      path: '/admin/midtrans',             icon: 'CreditCard',      group_name: 'Integrasi',          sort_order: 551, required_permission: PERMISSIONS.MIDTRANS },
  { key: 'api-connect',         label: 'Integrasi & API',       path: '/admin/api-connect',          icon: 'Plug',            group_name: 'Integrasi',          sort_order: 552, required_permission: PERMISSIONS.API_CONNECT },

  // ── Pengaturan (1000s) ────────────────────────────────────────────────────
  { key: 'settings',            label: 'Pengaturan Umum',       path: '/admin/settings',             icon: 'Settings',        group_name: 'Pengaturan',         sort_order: 1001, required_permission: PERMISSIONS.SETTINGS },
  { key: 'appearance',          label: 'Tampilan & Branding',   path: '/admin/appearance',           icon: 'Palette',         group_name: 'Pengaturan',         sort_order: 1002, required_permission: PERMISSIONS.APPEARANCE },
  { key: 'pdf-layout',          label: 'Layout Dokumen PDF',    path: '/admin/pdf-layout',           icon: 'FileText',        group_name: 'Pengaturan',         sort_order: 1003, required_permission: PERMISSIONS.APPEARANCE },
  { key: 'users',               label: 'Hak Akses (RBAC)',      path: '/admin/users',                icon: 'ShieldCheck',     group_name: 'Pengaturan',         sort_order: 1004, required_permission: PERMISSIONS.USERS },
  { key: '2fa',                 label: 'Keamanan',              path: '/admin/2fa',                  icon: 'Shield',          group_name: 'Pengaturan',         sort_order: 1005, required_permission: PERMISSIONS.TWO_FA },
  { key: 'supabase-setup',      label: 'Panduan Backend',       path: '/admin/supabase-setup',       icon: 'Database',        group_name: 'Pengaturan',         sort_order: 1006, required_permission: PERMISSIONS.SUPABASE_SETUP },
];

/**
 * Get menu items filtered by a set of granted permission keys.
 */
export const getMenusByPermissions = (permissionKeys: string[]): AdminMenuItem[] => {
  const permissionSet = new Set(permissionKeys);
  return RECOMMENDED_MENUS.filter(menu => permissionSet.has(menu.required_permission));
};

/** Get menu item by path */
export const getMenuByPath = (path: string): AdminMenuItem | undefined =>
  RECOMMENDED_MENUS.find(menu => menu.path === path);

/** All unique group names, in definition order */
export const getMenuGroups = (): string[] => {
  const seen = new Set<string>();
  return RECOMMENDED_MENUS.reduce<string[]>((acc, m) => {
    if (!seen.has(m.group_name)) { seen.add(m.group_name); acc.push(m.group_name); }
    return acc;
  }, []);
};

/**
 * Default permission sets per role.
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  super_admin: RECOMMENDED_MENUS.map(m => m.required_permission),

  owner: RECOMMENDED_MENUS.map(m => m.required_permission),

  branch_manager: [
    'dashboard', 'analytics', 'web-vitals', 'kpi-dashboard', 'ai-summary',
    'leads', 'chat-leads', 'bookings', 'packages', 'coupons', 'banners',
    'departures', 'departure-tracking', 'sos-alerts',
    'customers', 'agents', 'branches', 'loyalty',
    'payments', 'reports', 'reports-central',
    'laporan-keuangan', 'laporan-keberangkatan', 'laporan-agen', 'laporan-reminder',
    'haji', 'manasik', 'room-assignments', 'manifest-jamaah',
    'equipment', 'document-verification',
  ],

  finance: [
    'dashboard', 'kpi-dashboard',
    'bookings', 'payments', 'refunds', 'finance-cash', 'finance-ar', 'finance-ap',
    'finance', 'finance-terpadu', 'savings', 'reports', 'reports-central',
    'advanced-reports', 'scheduled-reports',
    'laporan-keuangan', 'laporan-agen', 'monitoring-tabungan', 'laporan-reminder',
    'customers', 'document-verification',
    'virtual-account', 'cicilan-reminder', 'cicilan-generator', 'wa-blast-tagihan',
  ],

  sales: [
    'dashboard', 'kpi-dashboard', 'ai-summary',
    'leads', 'chat-leads', 'bookings', 'packages', 'package-types', 'coupons',
    'customers', 'loyalty', 'referrals',
    'banners', 'landing-pages', 'announcements',
    'departures', 'document-verification',
    'payments',
  ],

  marketing: [
    'dashboard', 'analytics', 'kpi-dashboard', 'ai-summary',
    'leads', 'chat-leads', 'packages', 'coupons',
    'blog', 'announcements', 'banners', 'landing-pages', 'marketing-materials',
    'whatsapp', 'email-templates', 'push-notifications', 'wa-otomatis',
    'faq-manager', 'customers', 'loyalty', 'referrals',
    'sentimen-feedback', 'rekomendasi-paket',
  ],

  operational: [
    'dashboard', 'kpi-dashboard',
    'bookings', 'packages', 'departures', 'departure-tracking', 'sos-alerts',
    'room-assignments', 'manifest-jamaah', 'manasik', 'haji',
    'itinerary-templates', 'absensi-digital', 'wa-blast-keberangkatan',
    'equipment', 'equipment-master', 'stock-opname',
    'customers', 'document-verification', 'document-types',
    'visa',
  ],

  equipment: [
    'dashboard',
    'equipment', 'equipment-master', 'equipment-settings', 'stock-opname',
    'departures', 'manifest-jamaah',
  ],

  agent: [
    'dashboard',
    'leads', 'bookings', 'packages', 'customers',
    'payments',
  ],
};
