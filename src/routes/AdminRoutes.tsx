import { Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardProtectedRoute from '@/components/dashboards/DashboardProtectedRoute';

import { LoadingState } from "@/components/shared/LoadingState";

const AdminLayout = lazy(() => import("@/components/admin/AdminLayoutImproved"));

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
const AdminAgents = lazy(() => import("@/pages/admin/AdminAgents"));
const AdminReports = lazy(() => import("@/pages/admin/AdminReports"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminPackageTypes = lazy(() => import("@/pages/admin/AdminPackageTypes"));
const AdminMasterData = lazy(() => import("@/pages/admin/AdminMasterData"));
const AdminLeads = lazy(() => import("@/pages/admin/AdminLeads"));
const AdminLeadDetail = lazy(() => import("@/pages/admin/AdminLeadDetail"));
const AdminLeadAnalytics = lazy(() => import("@/pages/admin/AdminLeadAnalytics"));
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
const AdminAdvancedReports = lazy(() => import("@/pages/admin/AdminAdvancedReports"));
const AdminHR = lazy(() => import("@/pages/admin/AdminHR"));
const AdminHajiManagement = lazy(() => import("@/pages/admin/AdminHajiManagement"));
const AdminItineraryTemplates = lazy(() => import("@/pages/admin/AdminItineraryTemplates"));
const AdminOfflineContent = lazy(() => import("@/pages/admin/AdminOfflineContent"));
const AdminDocumentGenerator = lazy(() => import("@/pages/admin/AdminDocumentGenerator"));
const AdminScheduledReports = lazy(() => import("@/pages/admin/AdminScheduledReports"));
const AdminCoupons = lazy(() => import("@/pages/admin/AdminCoupons"));


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

const ALL_STAFF_ROLES = ['super_admin', 'owner', 'branch_manager', 'finance', 'sales', 'marketing', 'operational', 'equipment', 'agent'] as const;

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingState />}>{children}</Suspense>;
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
      <Route path="analytics" element={<LazyPage><DashboardProtectedRoute moduleKey="admin_analytics"><AdminAnalytics /></DashboardProtectedRoute></LazyPage>} />
      <Route path="branch-manager" element={<LazyPage><DashboardProtectedRoute moduleKey="branch_manager_dashboard"><BranchManagerDashboard /></DashboardProtectedRoute></LazyPage>} />
      <Route path="finance-dashboard" element={<LazyPage><DashboardProtectedRoute moduleKey="finance_dashboard"><FinanceDashboard /></DashboardProtectedRoute></LazyPage>} />
      <Route path="sales-dashboard" element={<LazyPage><DashboardProtectedRoute moduleKey="sales_dashboard"><SalesDashboard /></DashboardProtectedRoute></LazyPage>} />
      <Route path="marketing-dashboard" element={<LazyPage><DashboardProtectedRoute moduleKey="marketing_dashboard"><MarketingDashboard /></DashboardProtectedRoute></LazyPage>} />
      <Route path="equipment-dashboard" element={<LazyPage><DashboardProtectedRoute moduleKey="equipment_dashboard"><EquipmentDashboard /></DashboardProtectedRoute></LazyPage>} />

      {/* Dashboard Management */}
      <Route path="dashboard-access" element={<LazyPage><DashboardAccessManagerPanel mode="standalone" /></LazyPage>} />

      {/* Sales & CRM */}
      <Route path="leads" element={<LazyPage><AdminLeads /></LazyPage>} />
      <Route path="leads/analytics" element={<LazyPage><AdminLeadAnalytics /></LazyPage>} />
      <Route path="leads/:id" element={<LazyPage><AdminLeadDetail /></LazyPage>} />
      <Route path="coupons" element={<LazyPage><AdminCoupons /></LazyPage>} />
      <Route path="landing-pages" element={<LazyPage><AdminLandingPages /></LazyPage>} />
      <Route path="landing-pages/:id" element={<LazyPage><AdminLandingPageEditor /></LazyPage>} />

      {/* Produk & Operasional */}
      <Route path="packages" element={<LazyPage><AdminPackages /></LazyPage>} />
      <Route path="packages/:id" element={<LazyPage><AdminPackageDetail /></LazyPage>} />
      <Route path="departures" element={<LazyPage><AdminDepartures /></LazyPage>} />
      <Route path="departures/:id" element={<LazyPage><AdminDepartureDetail /></LazyPage>} />
      <Route path="bookings" element={<LazyPage><AdminBookings /></LazyPage>} />
      <Route path="bookings/create" element={<LazyPage><AdminBookingCreate /></LazyPage>} />
      <Route path="bookings/:id" element={<LazyPage><AdminBookingDetail /></LazyPage>} />
      <Route path="equipment" element={<LazyPage><EquipmentPage /></LazyPage>} />
      <Route path="itinerary-templates" element={<LazyPage><AdminItineraryTemplates /></LazyPage>} />
      <Route path="savings" element={<LazyPage><AdminSavingsPlans /></LazyPage>} />
      <Route path="room-assignments" element={<LazyPage><AdminRoomAssignments /></LazyPage>} />

      {/* Keuangan & Akuntansi */}
      <Route path="payments" element={<LazyPage><AdminPayments /></LazyPage>} />
      <Route path="finance-cash" element={<LazyPage><AdminFinanceCash /></LazyPage>} />
      <Route path="finance/ar" element={<LazyPage><AdminFinanceAR /></LazyPage>} />
      <Route path="finance/ap" element={<LazyPage><AdminFinanceAP /></LazyPage>} />
      <Route path="finance" element={<LazyPage><AdminFinancePL /></LazyPage>} />

      {/* Jamaah & Agent */}
      <Route path="customers" element={<LazyPage><AdminCustomers /></LazyPage>} />
      <Route path="customers/:id" element={<LazyPage><AdminCustomerDetail /></LazyPage>} />
      <Route path="agents" element={<LazyPage><AdminAgents /></LazyPage>} />
      <Route path="branches" element={<LazyPage><AdminBranches /></LazyPage>} />
      <Route path="loyalty" element={<LazyPage><AdminLoyalty /></LazyPage>} />
      <Route path="referrals" element={<LazyPage><AdminReferrals /></LazyPage>} />
      <Route path="haji" element={<LazyPage><AdminHajiManagement /></LazyPage>} />
      <Route path="manasik" element={<LazyPage><AdminManasik /></LazyPage>} />
      <Route path="visa" element={<LazyPage><AdminVisaManagement /></LazyPage>} />

      {/* SDM (HR) */}
      <Route path="hr" element={<LazyPage><AdminHR /></LazyPage>} />
      <Route path="hr/payroll" element={<LazyPage><AdminPayroll /></LazyPage>} />

      {/* Support & Komunikasi */}
      <Route path="support" element={<LazyPage><AdminSupportTickets /></LazyPage>} />
      <Route path="whatsapp" element={<LazyPage><AdminWhatsApp /></LazyPage>} />
      <Route path="marketing-materials" element={<LazyPage><AdminMarketingMaterials /></LazyPage>} />

      {/* Dokumen & Surat */}
      <Route path="document-verification" element={<LazyPage><AdminDocumentVerification /></LazyPage>} />
      <Route path="document-types" element={<LazyPage><AdminDocumentTypes /></LazyPage>} />
      <Route path="documents-generator" element={<LazyPage><AdminDocumentGenerator /></LazyPage>} />
      <Route path="offline-content" element={<LazyPage><AdminOfflineContent /></LazyPage>} />

      {/* Laporan */}
      <Route path="reports" element={<LazyPage><AdminReports /></LazyPage>} />
      <Route path="advanced-reports" element={<LazyPage><AdminAdvancedReports /></LazyPage>} />
      <Route path="scheduled-reports" element={<LazyPage><AdminScheduledReports /></LazyPage>} />

      {/* Pengaturan */}
      <Route path="users" element={<LazyPage><AdminUsers /></LazyPage>} />
      {/* Legacy redirect — UserPermissionsManager is now a dialog inside /admin/users */}
      <Route path="user-permissions" element={<Navigate to="/admin/users" replace />} />
      <Route path="roles" element={<LazyPage><AdminRoleManagement /></LazyPage>} />
      <Route path="security-audit" element={<LazyPage><AdminSecurityAudit /></LazyPage>} />
      <Route path="2fa" element={<LazyPage><Admin2FASettings /></LazyPage>} />
      <Route path="appearance" element={<LazyPage><AdminAppearance /></LazyPage>} />


      <Route path="package-types" element={<LazyPage><AdminPackageTypes /></LazyPage>} />
      <Route path="settings" element={<LazyPage><AdminSettings /></LazyPage>} />

      {/* Master Data */}
      <Route path="master-data" element={<LazyPage><AdminMasterData /></LazyPage>} />
      <Route path="airlines" element={<LazyPage><AdminAirlines /></LazyPage>} />
      <Route path="airports" element={<LazyPage><AdminAirports /></LazyPage>} />
      <Route path="hotels" element={<LazyPage><AdminHotels /></LazyPage>} />
      <Route path="muthawifs" element={<LazyPage><AdminMuthawifs /></LazyPage>} />
      <Route path="bus-providers" element={<LazyPage><AdminBusProviders /></LazyPage>} />
      <Route path="vendors" element={<LazyPage><AdminVendors /></LazyPage>} />
    </Route>
  );
}
