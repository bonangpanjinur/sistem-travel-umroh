import { AppRole } from '@/types/database';

/**
 * Centralized Permission Keys
 * 
 * Using constants for permission keys ensures type safety, avoids typos,
 * and makes it easy to find all references to a specific permission.
 */

export const PERMISSIONS = {
  // Overview
  DASHBOARD: 'dashboard',
  ANALYTICS: 'analytics',
  WEB_VITALS: 'web-vitals',

  // Penjualan
  LEADS: 'leads',
  BOOKINGS: 'bookings',
  PACKAGES: 'packages',
  PACKAGE_TYPES: 'package-types',
  COUPONS: 'coupons',

  // Konten & Marketing
  ANNOUNCEMENTS: 'announcements',
  BANNERS: 'banners',
  LANDING_PAGES: 'landing-pages',
  MARKETING_MATERIALS: 'marketing-materials',
  WHATSAPP: 'whatsapp',

  // Keberangkatan
  DEPARTURES: 'departures',
  ROOM_ASSIGNMENTS: 'room-assignments',
  HAJI: 'haji',
  MANASIK: 'manasik',
  ITINERARY_TEMPLATES: 'itinerary-templates',
  EQUIPMENT: 'equipment',
  EQUIPMENT_MASTER: 'equipment-master',
  EQUIPMENT_SETTINGS: 'equipment-settings',
  STOCK_OPNAME: 'stock-opname',

  // Keuangan
  PAYMENTS: 'payments',
  FINANCE_CASH: 'finance-cash',
  FINANCE_AR: 'finance-ar',
  FINANCE_AP: 'finance-ap',
  FINANCE: 'finance',
  SAVINGS: 'savings',
  REPORTS: 'reports',
  ADVANCED_REPORTS: 'advanced-reports',
  SCHEDULED_REPORTS: 'scheduled-reports',
  EXCHANGE_RATES: 'exchange-rates',

  // Jamaah & Agen
  CUSTOMERS: 'customers',
  AGENTS: 'agents',
  BRANCHES: 'branches',
  LOYALTY: 'loyalty',
  REFERRALS: 'referrals',
  VISA: 'visa',

  // SDM
  HR: 'hr',
  PAYROLL: 'payroll',

  // Dokumen
  DOCUMENT_VERIFICATION: 'document-verification',
  DOCUMENT_TYPES: 'document-types',
  DOCUMENTS_GENERATOR: 'documents-generator',
  DOCUMENT_EXPIRY_TRACKER: 'document-expiry-tracker',
  OFFLINE_CONTENT: 'offline-content',
  SUPPORT: 'support',
  CANCELLATION_POLICIES: 'cancellation-policies',

  // Aset Kantor
  OFFICE_ASSETS: 'office-assets',

  // Master Data
  HOTELS: 'hotels',
  AIRLINES: 'airlines',
  AIRPORTS: 'airports',
  VENDORS: 'vendors',
  MUTHAWIFS: 'muthawifs',
  BUS_PROVIDERS: 'bus-providers',
  MASTER_DATA: 'master-data',

  // Pengaturan
  USERS: 'users',
  ROLES: 'roles',
  DASHBOARD_ACCESS: 'dashboard-access',
  RBAC_TOOLS: 'rbac-tools',
  RBAC_STATUS: 'rbac-status',
  SECURITY_AUDIT: 'security-audit',
  TWO_FA: '2fa',
  APPEARANCE: 'appearance',
  PWA_SETTINGS: 'pwa-settings',
  SETTINGS: 'settings',
  API_CONNECT: 'api-connect',
  SUPABASE_SETUP: 'supabase-setup',

  // Fase 1 — Keanggotaan & Komisi Cabang
  MEMBERSHIPS: 'memberships',
  BRANCH_COMMISSIONS: 'branch-commissions',

  // Fase 4 — Analytics & Reporting
  AGENT_COMMISSION_REPORT: 'agent-commission-report',

  // Fase 5 — Notifikasi & Komunikasi
  EMAIL_TEMPLATES: 'email-templates',
  PUSH_NOTIFICATIONS: 'push-notifications',

  // Fase 6 — Operational Excellence
  DEPARTURE_TRACKING: 'departure-tracking',
  SOS_ALERTS: 'sos-alerts',
  REFUNDS: 'refunds',
  ACTIVITY_LOG: 'activity-log',

  // KPI Dashboard
  KPI_DASHBOARD: 'kpi-dashboard',

  // Blog & Artikel
  BLOG: 'blog',

  // FAQ Manager
  FAQ_MANAGER: 'faq-manager',

  // Keuangan Terpadu
  FINANCE_TERPADU: 'finance-terpadu',

  // Ringkasan AI Otomatis
  AI_SUMMARY: 'ai-summary',

  // Webhook Outgoing
  WEBHOOKS: 'webhooks',

  // Fase 6 — Dashboard Admin & Laporan Keuangan
  LAPORAN_KEUANGAN: 'laporan-keuangan',
  LAPORAN_KEBERANGKATAN: 'laporan-keberangkatan',
  LAPORAN_AGEN: 'laporan-agen',
  MONITORING_TABUNGAN: 'monitoring-tabungan',

  // Fase 7 — Manajemen Operasional Muthawif
  MANIFEST_JAMAAH: 'manifest-jamaah',
  ABSENSI_DIGITAL: 'absensi-digital',
  WA_BLAST_KEBERANGKATAN: 'wa-blast-keberangkatan',
  WA_BLAST_TAGIHAN: 'wa-blast-tagihan',
  WA_BROADCAST: 'wa-broadcast',
  MUTHAWIF_DASHBOARD: 'muthawif-dashboard',

  // Fase 9 — Integrasi & Otomasi
  WA_OTOMATIS: 'wa-otomatis',
  MIDTRANS: 'midtrans',
  CICILAN_REMINDER: 'cicilan-reminder',
  PEMBAYARAN_REMINDER: 'pembayaran-reminder',
  VIRTUAL_ACCOUNT: 'virtual-account',

  // Toko Online / E-Commerce
  STORE: 'store',
  STORE_PRODUCTS: 'store-products',
  STORE_ORDERS: 'store-orders',
  STORE_CATEGORIES: 'store-categories',
  STORE_SUPPLIERS: 'store-suppliers',
  STORE_PURCHASE_ORDERS: 'store-purchase-orders',
  STORE_SALES_REPORT: 'store-sales-report',
  STORE_STOCK_MOVEMENTS: 'store-stock-movements',
  STORE_STOCK_OPNAME: 'store-stock-opname',
  STORE_LOW_STOCK: 'store-low-stock',
  STORE_OPNAME_SESSIONS: 'store-opname-sessions',

  // Fase 10 — AI & Smart Analytics
  GEMINI_AI: 'gemini-ai',
  SENTIMEN_FEEDBACK: 'sentimen-feedback',
  PREDIKSI_SEAT: 'prediksi-seat',
  SMART_NOTIF: 'smart-notif',
  REKOMENDASI_PAKET: 'rekomendasi-paket',

  // Fase 14 — Live Chat & Konversi Publik
  CHAT_LEADS: 'chat-leads',

  // FITUR 01 — SOS Real-time (SOS_ALERTS sudah ada di atas sebagai 'sos-alerts')
  MUTHAWIF_SOS: 'muthawif-sos',

  // FITUR 02 — Notifikasi Visa Otomatis
  VISA_NOTIFICATIONS: 'visa-notifications',
  VISA_STATUS_LOGS: 'visa-status-logs',

  // FITUR 03 — SISKOHAT Kemenag
  SISKOHAT: 'siskohat',
  SISKOHAT_EXPORT: 'siskohat-export',

  // FITUR 04 — Approval Workflow Berjenjang
  APPROVALS: 'approvals',
  APPROVAL_CONFIGS: 'approval-configs',

  // FITUR 05 — Kontrak Vendor
  VENDOR_CONTRACTS: 'vendor-contracts',

  // FITUR 06 — Budget vs Realisasi
  DEPARTURE_BUDGET: 'departure-budget',

  // FITUR 07 — Pelatihan Agen
  TRAINING: 'training',
  AGENT_TRAINING: 'agent-training',

  // FITUR 08 — Media Gallery
  MEDIA_GALLERY: 'media-gallery',

  // FITUR 09 — Sub-Agen Multi-Level
  AGENT_NETWORK: 'agent-network',
  AGENT_OVERRIDE_COMMISSIONS: 'agent-override-commissions',

  // FITUR 10 — Kalkulator Bagasi
  BAGGAGE_CALCULATOR: 'baggage-calculator',

  // Sprint 4
  CICILAN_GENERATOR: 'cicilan-generator',
  PROPOSAL_GENERATOR: 'proposal-generator',

  // P2 — Perbandingan Profitabilitas Paket
  PROFITABILITAS_PAKET: 'profitabilitas-paket',

  // Laporan Reminder
  LAPORAN_REMINDER: 'laporan-reminder',

  // WhatsApp Multi-Provider & Roadmap (Fase 31)
  WA_PROVIDER: 'wa-provider',
  WA_ROADMAP:  'wa-roadmap',
} as const;

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS];

/**
 * Helper to get all permission keys as an array
 */
export const ALL_PERMISSION_KEYS = Object.values(PERMISSIONS);

/**
 * Hierarki peran — role yang lebih tinggi mewarisi permission dari role di bawahnya.
 *
 * Catatan desain:
 * - `sales` TIDAK mewarisi `agent`. Sales adalah staf internal; agent adalah mitra eksternal
 *   dengan portal dan data terpisah.
 * - `sub_agent` mewarisi izin agent (tampilan paket, daftar jamaah sendiri).
 * - `jamaah` dan `customer` tidak ada dalam hierarki karena mereka hanya memiliki
 *   akses ke portal pribadi mereka sendiri, bukan ke modul admin.
 */
export const ROLE_HIERARCHY: Record<string, string[]> = {
  super_admin: ['owner', 'it'],
  owner: ['branch_manager', 'finance'],
  it: [],
  branch_manager: ['operational', 'sales', 'marketing'],
  finance: [],
  operational: ['equipment'],
  sales: [],
  marketing: [],
  equipment: [],
  agent: [],
  sub_agent: ['agent'],
  customer: [],
  jamaah: [],
};

/**
 * Helper to get all inherited roles for a given role (recursive)
 */
export function getInheritedRoles(role: AppRole): AppRole[] {
  const inherited = (ROLE_HIERARCHY[role] || []) as AppRole[];
  let allInherited = [...inherited];
  
  for (const childRole of inherited) {
    allInherited = [...allInherited, ...getInheritedRoles(childRole)];
  }
  
  return Array.from(new Set(allInherited));
}
