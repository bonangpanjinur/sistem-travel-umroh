import { Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardProtectedRoute from '@/components/dashboards/DashboardProtectedRoute';
import PermissionRoute from "@/components/auth/PermissionRoute";
import { PERMISSIONS } from "@/lib/permissions";

import { LoadingState } from "@/components/shared/LoadingState";

const AdminLayout = lazy(() => import("@/components/admin/AdminLayoutDynamicImproved"));

const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminAnalytics = lazy(() => import("@/pages/admin/AdminAnalytics"));
const AdminPackages = lazy(() => import("@/pages/admin/AdminPackages"));
const AdminPackageDetail = lazy(() => import("@/pages/admin/AdminPackageDetail"));
const AdminBookings = lazy(() => import("@/pages/admin/AdminBookings"));
const AdminBookingDetail = lazy(() => import("@/pages/admin/AdminBookingDetail"));
const AdminPayments = lazy(() => import("@/pages/admin/AdminPayments"));
const AdminCustomers = lazy(() => import("@/pages/admin/AdminCustomers"));
const AdminCustomerDetail = lazy(() => import("@/pages/admin/AdminCustomerDetail"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminRoleManagement = lazy(() => import("@/pages/admin/AdminRoleManagement"));
const AdminRBACTools = lazy(() => import("@/pages/admin/AdminRBACTools"));
const AdminRBACStatus = lazy(() => import("@/pages/admin/AdminRBACStatus"));
const AdminAgents = lazy(() => import("@/pages/admin/AdminAgents"));
const AdminReports = lazy(() => import("@/pages/admin/AdminReports"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminPackageTypes = lazy(() => import("@/pages/admin/AdminPackageTypes"));
const AdminMasterData = lazy(() => import("@/pages/admin/AdminMasterData"));
const AdminLeads = lazy(() => import("@/pages/admin/AdminLeads"));
const AdminChatLeads = lazy(() => import("@/pages/admin/AdminChatLeads"));
const AdminLeadDetail = lazy(() => import("@/pages/admin/AdminLeadDetail"));
const AdminLeadAnalytics = lazy(() => import("@/pages/admin/AdminLeadAnalytics"));
const AdminFollowUpReminder = lazy(() => import("@/pages/admin/AdminFollowUpReminder"));
const AdminRoomAssignments = lazy(() => import("@/pages/admin/AdminRoomAssignments"));
const AdminDepartures = lazy(() => import("@/pages/admin/AdminDepartures"));
const AdminDepartureDetail = lazy(() => import("@/pages/admin/AdminDepartureDetail"));
const AdminSavingsPlans = lazy(() => import("@/pages/admin/AdminSavingsPlans"));
const AdminDocumentVerification = lazy(() => import("@/pages/admin/AdminDocumentVerification"));
const AdminDocumentTypes = lazy(() => import("@/pages/admin/AdminDocumentTypes"));
const AdminAppearance = lazy(() => import("@/pages/admin/AdminAppearance"));
const AdminBranches = lazy(() => import("@/pages/admin/AdminBranches"));
const AdminFinancePL = lazy(() => import("@/pages/admin/AdminFinancePL"));
const AdminFinanceCash = lazy(() => import("@/pages/admin/AdminFinanceCash"));
const AdminVendors = lazy(() => import("@/pages/admin/AdminVendors"));
const AdminLoyalty = lazy(() => import("@/pages/admin/AdminLoyalty"));
const AdminReferrals = lazy(() => import("@/pages/admin/AdminReferrals"));
const AdminSupportTickets = lazy(() => import("@/pages/admin/AdminSupportTickets"));
const AdminSecurityAudit = lazy(() => import("@/pages/admin/AdminSecurityAudit"));
const Admin2FASettings = lazy(() => import("@/pages/admin/Admin2FASettings"));
const AdminWhatsApp = lazy(() => import("@/pages/admin/AdminWhatsApp"));
const KorespondensiHubPage = lazy(() => import("@/pages/admin/KorespondensiHubPage"));
const AdminAdvancedReports = lazy(() => import("@/pages/admin/AdminAdvancedReports"));
const AdminHR = lazy(() => import("@/pages/admin/AdminHR"));
const AdminHajiManagement = lazy(() => import("@/pages/admin/AdminHajiManagement"));
const AdminItineraryTemplates = lazy(() => import("@/pages/admin/AdminItineraryTemplates"));
const AdminOfflineContent = lazy(() => import("@/pages/admin/AdminOfflineContent"));
const AdminDocumentGenerator = lazy(() => import("@/pages/admin/AdminDocumentGenerator"));
const AdminScheduledReports = lazy(() => import("@/pages/admin/AdminScheduledReports"));
const AdminCoupons = lazy(() => import("@/pages/admin/AdminCoupons"));
const AdminBanners = lazy(() => import("@/pages/admin/AdminBanners"));
const AdminEquipmentMaster = lazy(() => import("@/pages/admin/AdminEquipmentMaster"));
const AdminEquipmentSettings = lazy(() => import("@/pages/admin/AdminEquipmentSettings"));
const AdminStockOpname = lazy(() => import("@/pages/admin/AdminStockOpname"));

const AdminLandingPages = lazy(() => import("@/pages/admin/AdminLandingPages"));
const AdminLandingPageEditor = lazy(() => import("@/pages/admin/AdminLandingPageEditor"));
const AdminBookingCreate = lazy(() => import("@/pages/admin/AdminBookingCreate"));
const EquipmentPage = lazy(() => import("@/pages/operational/EquipmentPage"));
const AdminMarketingMaterials = lazy(() => import("@/pages/admin/AdminMarketingMaterials"));
const AdminFinanceAR = lazy(() => import("@/pages/admin/AdminFinanceAR"));
const AdminFinanceAP = lazy(() => import("@/pages/admin/AdminFinanceAP"));
const AdminPayroll = lazy(() => import("@/pages/admin/AdminPayroll"));
const AdminManasik = lazy(() => import("@/pages/admin/AdminManasik"));
const AdminVisaManagement = lazy(() => import("@/pages/admin/AdminVisaManagement"));
const AdminAirlines = lazy(() => import("@/pages/admin/AdminAirlines"));

// Batch Fitur 01–10
const AdminSISKOHAT        = lazy(() => import("@/pages/admin/AdminSISKOHAT"));
const AdminApprovals       = lazy(() => import("@/pages/admin/AdminApprovals"));
const AdminVendorContracts = lazy(() => import("@/pages/admin/AdminVendorContracts"));
const AdminTraining        = lazy(() => import("@/pages/admin/AdminTraining"));
const AdminMediaGallery    = lazy(() => import("@/pages/admin/AdminMediaGallery"));
const AdminAirports = lazy(() => import("@/pages/admin/AdminAirports"));
const BranchManagerDashboard = lazy(() => import("@/pages/admin/dashboards/BranchManagerDashboard"));
const FinanceDashboard = lazy(() => import("@/pages/admin/dashboards/FinanceDashboard"));
const SalesDashboard = lazy(() => import("@/pages/admin/dashboards/SalesDashboard"));
const MarketingDashboard = lazy(() => import("@/pages/admin/dashboards/MarketingDashboard"));
const EquipmentDashboard = lazy(() => import("@/pages/admin/dashboards/EquipmentDashboard"));
const DashboardAccessManager = lazy(() => import("@/pages/admin/DashboardAccessManager"));
const DashboardAccessManagerPanel = lazy(() => import("@/components/admin/DashboardAccessManagerPanel"));
const AdminHotels = lazy(() => import("@/pages/admin/AdminHotels"));
const AdminMuthawifs = lazy(() => import("@/pages/admin/AdminMuthawifs"));
const AdminBusProviders = lazy(() => import("@/pages/admin/AdminBusProviders"));
const AdminAnnouncements = lazy(() => import("@/pages/admin/AdminAnnouncements"));
const AdminApiConnect = lazy(() => import("@/pages/admin/AdminApiConnect"));
const AdminSupabaseSetup = lazy(() => import("@/pages/admin/AdminSupabaseSetup"));
const AdminMemberships = lazy(() => import("@/pages/admin/AdminMemberships"));
const AdminBranchCommissions = lazy(() => import("@/pages/admin/AdminBranchCommissions"));

const AdminAgentCommissionReport = lazy(() => import("@/pages/admin/AdminAgentCommissionReport"));
const AdminEmailTemplates = lazy(() => import("@/pages/admin/AdminEmailTemplates"));
const AdminPushNotifications = lazy(() => import("@/pages/admin/AdminPushNotifications"));
const AdminDepartureTracking = lazy(() => import("@/pages/admin/AdminDepartureTracking"));
const AdminSOSAlerts = lazy(() => import("@/pages/admin/AdminSOSAlerts"));
const AdminKPIDashboard = lazy(() => import("@/pages/admin/AdminKPIDashboard"));
const AdminBlog = lazy(() => import("@/pages/admin/AdminBlog"));
const AdminFinanceTerpadu = lazy(() => import("@/pages/admin/AdminFinanceTerpadu"));
const AdminAISummary = lazy(() => import("@/pages/admin/AdminAISummary"));
const AdminWebhooks = lazy(() => import("@/pages/admin/AdminWebhooks"));

// Fase 6 — Dashboard Admin & Laporan Keuangan
const AdminLaporanKeuangan = lazy(() => import("@/pages/admin/AdminLaporanKeuangan"));
const AdminLaporanKeberangkatan = lazy(() => import("@/pages/admin/AdminLaporanKeberangkatan"));
const AdminLaporanAgen = lazy(() => import("@/pages/admin/AdminLaporanAgen"));
const AdminMonitoringTabungan = lazy(() => import("@/pages/admin/AdminMonitoringTabungan"));

// Fase 7 — Manajemen Operasional Muthawif
const AdminMuthawifDetail = lazy(() => import("@/pages/admin/AdminMuthawifDetail"));
const AdminManifestJamaah = lazy(() => import("@/pages/admin/AdminManifestJamaah"));
const AdminAbsensiDigital = lazy(() => import("@/pages/admin/AdminAbsensiDigital"));
const AdminWABlastKeberangkatan = lazy(() => import("@/pages/admin/AdminWABlastKeberangkatan"));
const MuthawifDashboard = lazy(() => import("@/pages/muthawif/MuthawifDashboard"));

// Fase 9 — Integrasi & Otomasi
const AdminWAOtomatis = lazy(() => import("@/pages/admin/AdminWAOtomatis"));
const AdminMidtrans = lazy(() => import("@/pages/admin/AdminMidtrans"));
const AdminCicilanReminder = lazy(() => import("@/pages/admin/AdminCicilanReminder"));
const AdminPembayaranReminder = lazy(() => import("@/pages/admin/AdminPembayaranReminder"));
const AdminVirtualAccount = lazy(() => import("@/pages/admin/AdminVirtualAccount"));

// Fase 10 — AI & Smart Analytics
const AdminSentimenFeedback = lazy(() => import("@/pages/admin/AdminSentimenFeedback"));
const AdminPrediksiSeat = lazy(() => import("@/pages/admin/AdminPrediksiSeat"));
const AdminSmartNotif = lazy(() => import("@/pages/admin/AdminSmartNotif"));
const AdminRekomendasiPaket = lazy(() => import("@/pages/admin/AdminRekomendasiPaket"));

const ALL_STAFF_ROLES = ['super_admin', 'owner', 'branch_manager', 'finance', 'sales', 'marketing', 'operational', 'equipment', 'agent'] as const;

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingState />}>{children}</Suspense>;
}

function P({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <PermissionRoute permissionKey={k}>
      <Suspense fallback={<LoadingState />}>{children}</Suspense>
    </PermissionRoute>
  );
}

export default function AdminRoutes() {
  return (
    <Route
      path="/admin"
      element={
        <ProtectedRoute>
          <Suspense fallback={<LoadingState />}>
            <AdminLayout />
          </Suspense>
        </ProtectedRoute>
      }
    >
      {/* Overview */}
      <Route index element={<LazyPage><AdminDashboard /></LazyPage>} />

      {/* Dashboard Routes with Dynamic Access Control */}
      <Route path="analytics" element={<P k={PERMISSIONS.ANALYTICS}><AdminAnalytics /></P>} />
      <Route path="branch-manager" element={<LazyPage><DashboardProtectedRoute moduleKey="branch_manager_dashboard"><BranchManagerDashboard /></DashboardProtectedRoute></LazyPage>} />
      <Route path="finance-dashboard" element={<LazyPage><DashboardProtectedRoute moduleKey="finance_dashboard"><FinanceDashboard /></DashboardProtectedRoute></LazyPage>} />
      <Route path="sales-dashboard" element={<LazyPage><DashboardProtectedRoute moduleKey="sales_dashboard"><SalesDashboard /></DashboardProtectedRoute></LazyPage>} />
      <Route path="marketing-dashboard" element={<LazyPage><DashboardProtectedRoute moduleKey="marketing_dashboard"><MarketingDashboard /></DashboardProtectedRoute></LazyPage>} />
      <Route path="equipment-dashboard" element={<LazyPage><DashboardProtectedRoute moduleKey="equipment_dashboard"><EquipmentDashboard /></DashboardProtectedRoute></LazyPage>} />

      {/* Dashboard Management */}
      <Route path="dashboard-access" element={<Navigate to="/admin/roles?tab=user-overrides" replace />} />

      {/* Sales & CRM */}
      <Route path="leads" element={<P k={PERMISSIONS.LEADS}><AdminLeads /></P>} />
      <Route path="leads/analytics" element={<P k={PERMISSIONS.LEADS}><AdminLeadAnalytics /></P>} />
      <Route path="leads/:id" element={<P k={PERMISSIONS.LEADS}><AdminLeadDetail /></P>} />
      <Route path="follow-up" element={<P k={PERMISSIONS.LEADS}><AdminFollowUpReminder /></P>} />
      <Route path="chat-leads" element={<P k={PERMISSIONS.CHAT_LEADS}><AdminChatLeads /></P>} />
      <Route path="coupons" element={<P k={PERMISSIONS.COUPONS}><AdminCoupons /></P>} />
      <Route path="banners" element={<P k={PERMISSIONS.BANNERS}><AdminBanners /></P>} />
      <Route path="landing-pages" element={<P k={PERMISSIONS.LANDING_PAGES}><AdminLandingPages /></P>} />
      <Route path="landing-pages/:id" element={<P k={PERMISSIONS.LANDING_PAGES}><AdminLandingPageEditor /></P>} />

      {/* Produk & Operasional */}
      <Route path="packages" element={<P k={PERMISSIONS.PACKAGES}><AdminPackages /></P>} />
      <Route path="packages/:id" element={<P k={PERMISSIONS.PACKAGES}><AdminPackageDetail /></P>} />
      <Route path="departures" element={<P k={PERMISSIONS.DEPARTURES}><AdminDepartures /></P>} />
      <Route path="departures/:id" element={<P k={PERMISSIONS.DEPARTURES}><AdminDepartureDetail /></P>} />
      <Route path="bookings" element={<P k={PERMISSIONS.BOOKINGS}><AdminBookings /></P>} />
      <Route path="bookings/create" element={<P k={PERMISSIONS.BOOKINGS}><AdminBookingCreate /></P>} />
      <Route path="bookings/:id" element={<P k={PERMISSIONS.BOOKINGS}><AdminBookingDetail /></P>} />
      <Route path="equipment" element={<P k={PERMISSIONS.EQUIPMENT}><EquipmentPage /></P>} />
      <Route path="equipment-master" element={<P k={PERMISSIONS.EQUIPMENT_MASTER}><AdminEquipmentMaster /></P>} />
      <Route path="equipment-settings" element={<P k={PERMISSIONS.EQUIPMENT_SETTINGS}><AdminEquipmentSettings /></P>} />
      <Route path="stock-opname" element={<P k={PERMISSIONS.STOCK_OPNAME}><AdminStockOpname /></P>} />
      <Route path="itinerary-templates" element={<P k={PERMISSIONS.ITINERARY_TEMPLATES}><AdminItineraryTemplates /></P>} />
      <Route path="savings" element={<P k={PERMISSIONS.SAVINGS}><AdminSavingsPlans /></P>} />
      <Route path="room-assignments" element={<P k={PERMISSIONS.ROOM_ASSIGNMENTS}><AdminRoomAssignments /></P>} />

      {/* Keuangan & Akuntansi */}
      <Route path="payments" element={<P k={PERMISSIONS.PAYMENTS}><AdminPayments /></P>} />
      <Route path="finance-cash" element={<P k={PERMISSIONS.FINANCE_CASH}><AdminFinanceCash /></P>} />
      <Route path="finance/ar" element={<P k={PERMISSIONS.FINANCE_AR}><AdminFinanceAR /></P>} />
      <Route path="finance/ap" element={<P k={PERMISSIONS.FINANCE_AP}><AdminFinanceAP /></P>} />
      <Route path="finance" element={<P k={PERMISSIONS.FINANCE}><AdminFinancePL /></P>} />

      {/* Jamaah & Agent */}
      <Route path="customers" element={<P k={PERMISSIONS.CUSTOMERS}><AdminCustomers /></P>} />
      <Route path="customers/:id" element={<P k={PERMISSIONS.CUSTOMERS}><AdminCustomerDetail /></P>} />
      <Route path="agents" element={<P k={PERMISSIONS.AGENTS}><AdminAgents /></P>} />
      <Route path="branches" element={<P k={PERMISSIONS.BRANCHES}><AdminBranches /></P>} />
      <Route path="loyalty" element={<P k={PERMISSIONS.LOYALTY}><AdminLoyalty /></P>} />
      <Route path="referrals" element={<P k={PERMISSIONS.REFERRALS}><AdminReferrals /></P>} />
      <Route path="haji" element={<P k={PERMISSIONS.HAJI}><AdminHajiManagement /></P>} />
      <Route path="manasik" element={<P k={PERMISSIONS.MANASIK}><AdminManasik /></P>} />
      <Route path="visa" element={<P k={PERMISSIONS.VISA}><AdminVisaManagement /></P>} />

      {/* SDM (HR) */}
      <Route path="hr" element={<P k={PERMISSIONS.HR}><AdminHR /></P>} />
      <Route path="hr/payroll" element={<P k={PERMISSIONS.PAYROLL}><AdminPayroll /></P>} />

      {/* Support & Komunikasi */}
      <Route path="support" element={<P k={PERMISSIONS.SUPPORT}><AdminSupportTickets /></P>} />
      <Route path="whatsapp" element={<P k={PERMISSIONS.WHATSAPP}><AdminWhatsApp /></P>} />
      <Route path="correspondence" element={<KorespondensiHubPage />} />
      <Route path="marketing-materials" element={<P k={PERMISSIONS.MARKETING_MATERIALS}><AdminMarketingMaterials /></P>} />

      {/* Dokumen & Surat */}
      <Route path="document-verification" element={<P k={PERMISSIONS.DOCUMENT_VERIFICATION}><AdminDocumentVerification /></P>} />
      <Route path="document-types" element={<P k={PERMISSIONS.DOCUMENT_TYPES}><AdminDocumentTypes /></P>} />
      <Route path="documents-generator" element={<P k={PERMISSIONS.DOCUMENTS_GENERATOR}><AdminDocumentGenerator /></P>} />
      <Route path="offline-content" element={<P k={PERMISSIONS.OFFLINE_CONTENT}><AdminOfflineContent /></P>} />

      {/* Laporan */}
      <Route path="reports" element={<P k={PERMISSIONS.REPORTS}><AdminReports /></P>} />
      <Route path="advanced-reports" element={<P k={PERMISSIONS.ADVANCED_REPORTS}><AdminAdvancedReports /></P>} />
      <Route path="scheduled-reports" element={<P k={PERMISSIONS.SCHEDULED_REPORTS}><AdminScheduledReports /></P>} />

      {/* Fase 6 — Dashboard Admin & Laporan Keuangan */}
      <Route path="laporan/keuangan" element={<P k={PERMISSIONS.LAPORAN_KEUANGAN}><LazyPage><AdminLaporanKeuangan /></LazyPage></P>} />
      <Route path="laporan/keberangkatan" element={<P k={PERMISSIONS.LAPORAN_KEBERANGKATAN}><LazyPage><AdminLaporanKeberangkatan /></LazyPage></P>} />
      <Route path="laporan/agen" element={<P k={PERMISSIONS.LAPORAN_AGEN}><LazyPage><AdminLaporanAgen /></LazyPage></P>} />
      <Route path="laporan/tabungan" element={<P k={PERMISSIONS.MONITORING_TABUNGAN}><LazyPage><AdminMonitoringTabungan /></LazyPage></P>} />

      {/* Pengaturan */}
      <Route path="users" element={<P k={PERMISSIONS.USERS}><AdminUsers /></P>} />
      {/* Legacy redirect — UserPermissionsManager is now a dialog inside /admin/users */}
      <Route path="user-permissions" element={<Navigate to="/admin/users" replace />} />
      <Route path="roles" element={<P k={PERMISSIONS.ROLES}><AdminRoleManagement /></P>} />
      <Route path="rbac-tools" element={<Navigate to="/admin/roles?tab=audit" replace />} />
      <Route path="rbac-status" element={<Navigate to="/admin/roles?tab=audit" replace />} />
      <Route path="security-audit" element={<P k={PERMISSIONS.SECURITY_AUDIT}><AdminSecurityAudit /></P>} />
      <Route path="2fa" element={<P k={PERMISSIONS.TWO_FA}><Admin2FASettings /></P>} />
      <Route path="appearance" element={<P k={PERMISSIONS.APPEARANCE}><AdminAppearance /></P>} />


      <Route path="package-types" element={<P k={PERMISSIONS.PACKAGE_TYPES}><AdminPackageTypes /></P>} />
      <Route path="settings" element={<P k={PERMISSIONS.SETTINGS}><AdminSettings /></P>} />
      <Route path="announcements" element={<P k={PERMISSIONS.ANNOUNCEMENTS}><AdminAnnouncements /></P>} />
      <Route path="api-connect" element={<P k={PERMISSIONS.API_CONNECT}><AdminApiConnect /></P>} />
      <Route path="supabase-setup" element={<P k={PERMISSIONS.SUPABASE_SETUP}><AdminSupabaseSetup /></P>} />

      {/* Fase 1 — Keanggotaan & Komisi Cabang */}
      <Route path="memberships" element={<P k={PERMISSIONS.MEMBERSHIPS}><AdminMemberships /></P>} />
      <Route path="branch-commissions" element={<P k={PERMISSIONS.BRANCH_COMMISSIONS}><AdminBranchCommissions /></P>} />

      {/* Fase 4 — Analytics & Reporting */}
      <Route path="agent-commission-report" element={<P k={PERMISSIONS.AGENT_COMMISSION_REPORT}><AdminAgentCommissionReport /></P>} />

      {/* Fase 5 — Notifikasi & Komunikasi */}
      <Route path="email-templates" element={<P k={PERMISSIONS.EMAIL_TEMPLATES}><AdminEmailTemplates /></P>} />
      <Route path="push-notifications" element={<P k={PERMISSIONS.PUSH_NOTIFICATIONS}><AdminPushNotifications /></P>} />

      {/* Fase 6 — Operational Excellence */}
      <Route path="departure-tracking" element={<P k={PERMISSIONS.DEPARTURE_TRACKING}><AdminDepartureTracking /></P>} />
      <Route path="sos-alerts" element={<P k={PERMISSIONS.SOS_ALERTS}><AdminSOSAlerts /></P>} />

      {/* KPI Dashboard */}
      <Route path="kpi-dashboard" element={<P k={PERMISSIONS.KPI_DASHBOARD}><LazyPage><AdminKPIDashboard /></LazyPage></P>} />

      {/* Blog & Artikel */}
      <Route path="blog" element={<P k={PERMISSIONS.BLOG}><LazyPage><AdminBlog /></LazyPage></P>} />

      {/* Keuangan Terpadu */}
      <Route path="finance-terpadu" element={<P k={PERMISSIONS.FINANCE_TERPADU}><LazyPage><AdminFinanceTerpadu /></LazyPage></P>} />

      {/* Ringkasan AI Otomatis */}
      <Route path="ai-summary" element={<P k={PERMISSIONS.AI_SUMMARY}><LazyPage><AdminAISummary /></LazyPage></P>} />

      {/* Webhook Outgoing */}
      <Route path="webhooks" element={<P k={PERMISSIONS.WEBHOOKS}><LazyPage><AdminWebhooks /></LazyPage></P>} />

      {/* Master Data */}
      <Route path="master-data" element={<P k={PERMISSIONS.MASTER_DATA}><AdminMasterData /></P>} />
      <Route path="airlines" element={<P k={PERMISSIONS.AIRLINES}><AdminAirlines /></P>} />
      <Route path="airports" element={<P k={PERMISSIONS.AIRPORTS}><AdminAirports /></P>} />
      <Route path="hotels" element={<P k={PERMISSIONS.HOTELS}><AdminHotels /></P>} />
      <Route path="muthawifs" element={<P k={PERMISSIONS.MUTHAWIFS}><AdminMuthawifs /></P>} />
      <Route path="muthawifs/:id" element={<P k={PERMISSIONS.MUTHAWIFS}><AdminMuthawifDetail /></P>} />
      <Route path="bus-providers" element={<P k={PERMISSIONS.BUS_PROVIDERS}><AdminBusProviders /></P>} />
      <Route path="vendors" element={<P k={PERMISSIONS.VENDORS}><AdminVendors /></P>} />

      {/* Batch Fitur 01–10 */}
      <Route path="siskohat"         element={<P k={PERMISSIONS.SISKOHAT}><LazyPage><AdminSISKOHAT /></LazyPage></P>} />
      <Route path="approvals"        element={<P k={PERMISSIONS.APPROVALS}><LazyPage><AdminApprovals /></LazyPage></P>} />
      <Route path="vendor-contracts" element={<P k={PERMISSIONS.VENDOR_CONTRACTS}><LazyPage><AdminVendorContracts /></LazyPage></P>} />
      <Route path="training"         element={<P k={PERMISSIONS.TRAINING}><LazyPage><AdminTraining /></LazyPage></P>} />
      <Route path="media-gallery"    element={<P k={PERMISSIONS.MEDIA_GALLERY}><LazyPage><AdminMediaGallery /></LazyPage></P>} />

      {/* Fase 7 — Manajemen Operasional Muthawif */}
      <Route path="manifest" element={<P k={PERMISSIONS.MANIFEST_JAMAAH}><AdminManifestJamaah /></P>} />
      <Route path="absensi" element={<P k={PERMISSIONS.ABSENSI_DIGITAL}><AdminAbsensiDigital /></P>} />
      <Route path="wa-blast" element={<P k={PERMISSIONS.WA_BLAST_KEBERANGKATAN}><AdminWABlastKeberangkatan /></P>} />

      {/* Fase 9 — Integrasi & Otomasi */}
      <Route path="wa-otomatis" element={<P k={PERMISSIONS.WA_OTOMATIS}><AdminWAOtomatis /></P>} />
      <Route path="midtrans" element={<P k={PERMISSIONS.MIDTRANS}><AdminMidtrans /></P>} />
      <Route path="cicilan-reminder" element={<P k={PERMISSIONS.CICILAN_REMINDER}><AdminCicilanReminder /></P>} />
      <Route path="pembayaran-reminder" element={<P k={PERMISSIONS.PEMBAYARAN_REMINDER}><AdminPembayaranReminder /></P>} />
      <Route path="virtual-account" element={<P k={PERMISSIONS.VIRTUAL_ACCOUNT}><AdminVirtualAccount /></P>} />

      {/* Fase 10 — AI & Smart Analytics */}
      <Route path="sentimen-feedback" element={<P k={PERMISSIONS.SENTIMEN_FEEDBACK}><AdminSentimenFeedback /></P>} />
      <Route path="prediksi-seat" element={<P k={PERMISSIONS.PREDIKSI_SEAT}><AdminPrediksiSeat /></P>} />
      <Route path="smart-notif" element={<P k={PERMISSIONS.SMART_NOTIF}><AdminSmartNotif /></P>} />
      <Route path="rekomendasi-paket" element={<P k={PERMISSIONS.REKOMENDASI_PAKET}><AdminRekomendasiPaket /></P>} />
    </Route>
  );
}
