/**
 * Maps admin route paths to dynamic imports so we can prefetch
 * the chunk on hover/focus before the user clicks.
 */
const map: Record<string, () => Promise<unknown>> = {
  "/admin": () => import("@/pages/admin/AdminDashboard"),
  "/admin/analytics": () => import("@/pages/admin/AdminAnalytics"),
  "/admin/branch-manager": () => import("@/pages/admin/dashboards/BranchManagerDashboard"),
  "/admin/finance-dashboard": () => import("@/pages/admin/dashboards/FinanceDashboard"),
  "/admin/sales-dashboard": () => import("@/pages/admin/dashboards/SalesDashboard"),
  "/admin/marketing-dashboard": () => import("@/pages/admin/dashboards/MarketingDashboard"),
  "/admin/equipment-dashboard": () => import("@/pages/admin/dashboards/EquipmentDashboard"),

  "/admin/leads": () => import("@/pages/admin/AdminLeads"),
  "/admin/leads/analytics": () => import("@/pages/admin/AdminLeadAnalytics"),
  "/admin/follow-up": () => import("@/pages/admin/AdminFollowUpReminder"),
  "/admin/chat-leads": () => import("@/pages/admin/AdminChatLeads"),
  "/admin/coupons": () => import("@/pages/admin/AdminCoupons"),
  "/admin/banners": () => import("@/pages/admin/AdminBanners"),
  "/admin/landing-pages": () => import("@/pages/admin/AdminLandingPages"),

  "/admin/packages": () => import("@/pages/admin/AdminPackages"),
  "/admin/departures": () => import("@/pages/admin/AdminDepartures"),
  "/admin/bookings": () => import("@/pages/admin/AdminBookings"),
  "/admin/bookings/create": () => import("@/pages/admin/AdminBookingCreate"),
  "/admin/equipment": () => import("@/pages/operational/EquipmentPage"),
  "/admin/office-assets": () => import("@/pages/operational/OfficeAssets"),
  "/admin/equipment-master": () => import("@/pages/admin/AdminEquipmentMaster"),
  "/admin/equipment-settings": () => import("@/pages/admin/AdminEquipmentSettings"),
  "/admin/stock-opname": () => import("@/pages/admin/AdminStockOpname"),
  "/admin/cancellation-policies": () => import("@/pages/admin/AdminCancellationPolicies"),
  "/admin/itinerary-templates": () => import("@/pages/admin/AdminItineraryTemplates"),
  "/admin/savings": () => import("@/pages/admin/AdminSavingsPlans"),
  "/admin/savings-management": () => import("@/pages/admin/AdminSavings"),
  "/admin/room-assignments": () => import("@/pages/admin/AdminRoomAssignments"),

  "/admin/payments": () => import("@/pages/admin/AdminPayments"),
  "/admin/finance-pl": () => import("@/pages/admin/AdminFinancePL"),
  "/admin/finance-cash": () => import("@/pages/admin/AdminFinanceCash"),
  "/admin/finance-ar": () => import("@/pages/admin/AdminFinanceAR"),
  "/admin/finance-ap": () => import("@/pages/admin/AdminFinanceAP"),
  "/admin/finance-terpadu": () => import("@/pages/admin/AdminFinanceTerpadu"),
  "/admin/payroll": () => import("@/pages/admin/AdminPayroll"),
  "/admin/exchange-rates": () => import("@/pages/admin/AdminExchangeRates"),
  "/admin/refunds": () => import("@/pages/admin/AdminRefunds"),
  "/admin/withdrawals": () => import("@/pages/admin/AdminWithdrawalManagement"),
  "/admin/payment-audit": () => import("@/pages/admin/AdminPaymentAuditLog"),
  "/admin/virtual-account": () => import("@/pages/admin/AdminVirtualAccount"),

  "/admin/customers": () => import("@/pages/admin/AdminCustomers"),
  "/admin/users": () => import("@/pages/admin/AdminUsers"),
  "/admin/roles": () => import("@/pages/admin/AdminRoleManagement"),
  "/admin/rbac-tools": () => import("@/pages/admin/AdminRBACTools"),
  "/admin/rbac-status": () => import("@/pages/admin/AdminRBACStatus"),
  "/admin/agents": () => import("@/pages/admin/AdminAgents"),
  "/admin/branches": () => import("@/pages/admin/AdminBranches"),
  "/admin/branch-comparison": () => import("@/pages/admin/AdminBranchComparison"),
  "/admin/branch-commissions": () => import("@/pages/admin/AdminBranchCommissions"),
  "/admin/memberships": () => import("@/pages/admin/AdminMemberships"),
  "/admin/loyalty": () => import("@/pages/admin/AdminLoyalty"),
  "/admin/referrals": () => import("@/pages/admin/AdminReferrals"),
  "/admin/tier-benefits": () => import("@/pages/admin/AdminTierBenefits"),

  "/admin/reports": () => import("@/pages/admin/AdminReports"),
  "/admin/reports-central": () => import("@/pages/admin/AdminReportsCentral"),
  "/admin/advanced-reports": () => import("@/pages/admin/AdminAdvancedReports"),
  "/admin/scheduled-reports": () => import("@/pages/admin/AdminScheduledReports"),
  "/admin/laporan-keuangan": () => import("@/pages/admin/AdminLaporanKeuangan"),
  "/admin/laporan-keberangkatan": () => import("@/pages/admin/AdminLaporanKeberangkatan"),
  "/admin/laporan-agen": () => import("@/pages/admin/AdminLaporanAgen"),
  "/admin/monitoring-tabungan": () => import("@/pages/admin/AdminMonitoringTabungan"),
  "/admin/kpi-dashboard": () => import("@/pages/admin/AdminKPIDashboard"),
  "/admin/activity-log": () => import("@/pages/admin/AdminActivityLog"),

  "/admin/settings": () => import("@/pages/admin/AdminSettings"),
  "/admin/package-types": () => import("@/pages/admin/AdminPackageTypes"),
  "/admin/master-data": () => import("@/pages/admin/AdminMasterData"),
  "/admin/document-types": () => import("@/pages/admin/AdminDocumentTypes"),
  "/admin/document-verification": () => import("@/pages/admin/AdminDocumentVerification"),
  "/admin/document-generator": () => import("@/pages/admin/AdminDocumentGenerator"),
  "/admin/document-expiry": () => import("@/pages/admin/AdminDocumentExpiryTracker"),
  "/admin/invoice-template": () => import("@/pages/admin/AdminInvoiceTemplate"),
  "/admin/appearance": () => import("@/pages/admin/AdminAppearance"),
  "/admin/pdf-layout": () => import("@/pages/admin/AdminPDFLayout"),
  "/admin/pwa-settings": () => import("@/pages/admin/AdminPWASettings"),
  "/admin/pwa-stats": () => import("@/pages/admin/AdminPWAInstallStats"),
  "/admin/access-simulator": () => import("@/pages/admin/AdminAccessSimulator"),
  "/admin/commission-calculator": () => import("@/pages/admin/AdminCommissionCalculator"),
  "/admin/baggage-policies": () => import("@/pages/admin/AdminBaggagePolicies"),
  "/admin/post-departure-survey": () => import("@/pages/admin/AdminPostDepartureSurvey"),
  "/admin/booking-transfers": () => import("@/pages/admin/AdminBookingTransfers"),
  "/admin/security-audit": () => import("@/pages/admin/AdminSecurityAudit"),
  "/admin/2fa-settings": () => import("@/pages/admin/Admin2FASettings"),
  "/admin/whatsapp": () => import("@/pages/admin/AdminWhatsApp"),
  "/admin/korespondensi": () => import("@/pages/admin/KorespondensiHubPage"),
  "/admin/hr": () => import("@/pages/admin/AdminHR"),
  "/admin/haji": () => import("@/pages/admin/AdminHajiManagement"),
  "/admin/offline-content": () => import("@/pages/admin/AdminOfflineContent"),
  "/admin/incomplete-documents": () => import("@/pages/admin/AdminIncompleteDocuments"),
  "/admin/absensi-tanah-suci": () => import("@/pages/admin/AdminAbsensiHarianTanahSuci"),
  "/admin/support-tickets": () => import("@/pages/admin/AdminSupportTickets"),
  "/admin/vendors": () => import("@/pages/admin/AdminVendors"),
  "/admin/marketing-materials": () => import("@/pages/admin/AdminMarketingMaterials"),
  "/admin/manasik": () => import("@/pages/admin/AdminManasik"),
  "/admin/visa": () => import("@/pages/admin/AdminVisaManagement"),
  "/admin/airlines": () => import("@/pages/admin/AdminAirlines"),
  "/admin/airports": () => import("@/pages/admin/AdminAirports"),
  "/admin/hotels": () => import("@/pages/admin/AdminHotels"),
  "/admin/muthawifs": () => import("@/pages/admin/AdminMuthawifs"),
  "/admin/bus-providers": () => import("@/pages/admin/AdminBusProviders"),
  "/admin/announcements": () => import("@/pages/admin/AdminAnnouncements"),
  "/admin/api-connect": () => import("@/pages/admin/AdminApiConnect"),
  "/admin/supabase-setup": () => import("@/pages/admin/AdminSupabaseSetup"),
  "/admin/email-templates": () => import("@/pages/admin/AdminEmailTemplates"),
  "/admin/push-notifications": () => import("@/pages/admin/AdminPushNotifications"),
  "/admin/push-outbox": () => import("@/pages/admin/AdminPushOutbox"),
  "/admin/departure-tracking": () => import("@/pages/admin/AdminDepartureTracking"),
  "/admin/sos-alerts": () => import("@/pages/admin/AdminSOSAlerts"),
  "/admin/webhooks": () => import("@/pages/admin/AdminWebhooks"),
  "/admin/blog": () => import("@/pages/admin/AdminBlog"),
  "/admin/faqs": () => import("@/pages/admin/AdminFAQManager"),
  "/admin/ai-summary": () => import("@/pages/admin/AdminAISummary"),

  "/admin/store": () => import("@/pages/admin/AdminStore"),
  "/admin/store/products": () => import("@/pages/admin/AdminStoreProducts"),
  "/admin/store/orders": () => import("@/pages/admin/AdminStoreOrders"),
  "/admin/store/categories": () => import("@/pages/admin/AdminStoreCategories"),
  "/admin/suppliers": () => import("@/pages/admin/AdminSuppliers"),
  "/admin/purchase-orders": () => import("@/pages/admin/AdminPurchaseOrders"),
  "/admin/store/sales-report": () => import("@/pages/admin/AdminStoreSalesReport"),
  "/admin/store/stock-movements": () => import("@/pages/admin/AdminStoreStockMovements"),
  "/admin/store/stock-opname": () => import("@/pages/admin/AdminStoreStockOpname"),
  "/admin/store/low-stock": () => import("@/pages/admin/AdminStoreLowStock"),
};

const inflight = new Set<string>();

/**
 * Prefetch the chunk associated with an admin path (e.g. on hover/focus).
 * No-ops for unknown paths or paths that contain dynamic params.
 */
export function prefetchAdminPath(path: string): void {
  if (!path || inflight.has(path)) return;
  const loader = map[path];
  if (!loader) return;
  inflight.add(path);
  try {
    loader().catch(() => {
      inflight.delete(path);
    });
  } catch {
    inflight.delete(path);
  }
}