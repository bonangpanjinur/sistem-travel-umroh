import { Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AdminLayout from "@/components/admin/AdminLayoutDynamic";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { LoadingState } from "@/components/shared/LoadingState";

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
const AdminAgents = lazy(() => import("@/pages/admin/AdminAgents"));
const AdminReports = lazy(() => import("@/pages/admin/AdminReports"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminPackageTypes = lazy(() => import("@/pages/admin/AdminPackageTypes"));
const AdminMasterData = lazy(() => import("@/pages/admin/AdminMasterData"));
const AdminLeads = lazy(() => import("@/pages/admin/AdminLeads"));
const AdminLeadDetail = lazy(() => import("@/pages/admin/AdminLeadDetail"));
const AdminLeadAnalytics = lazy(() => import("@/pages/admin/AdminLeadAnalytics"));
const AdminRolePermissions = lazy(() => import("@/pages/admin/AdminRolePermissions"));
const AdminUdacManagement = lazy(() => import("@/pages/admin/AdminUdacManagement"));
const AdminUdacAudit = lazy(() => import("@/pages/admin/AdminUdacAudit"));
const AdminUdacSimulator = lazy(() => import("@/pages/admin/AdminUdacSimulator"));
const AdminRoomAssignments = lazy(() => import("@/pages/admin/AdminRoomAssignments"));
const AdminDepartures = lazy(() => import("@/pages/admin/AdminDepartures"));
const AdminSavingsPlans = lazy(() => import("@/pages/admin/AdminSavingsPlans"));
const AdminDocumentVerification = lazy(() => import("@/pages/admin/AdminDocumentVerification"));
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
const AdminStaticPages = lazy(() => import("@/pages/admin/AdminStaticPages"));
const AdminTestimonials = lazy(() => import("@/pages/admin/AdminTestimonials"));
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

// All roles except 'customer' are allowed to enter the admin layout shell.
// The specific menus and pages will be further restricted by UDAC permissions.
const ALL_STAFF_ROLES = ['super_admin', 'owner', 'branch_manager', 'finance', 'sales', 'marketing', 'operational', 'equipment', 'agent'] as const;

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingState />}>{children}</Suspense>;
}

export default function AdminRoutes() {
  return (
    <Route
      path="/admin"
      element={
        <ProtectedRoute allowedRoles={[...ALL_STAFF_ROLES]}>
          <ThemeProvider>
            <AdminLayout />
          </ThemeProvider>
        </ProtectedRoute>
      }
    >
      <Route index element={<ProtectedRoute permission="dashboard.view"><LazyPage><AdminDashboard /></LazyPage></ProtectedRoute>} />
      <Route path="analytics" element={<ProtectedRoute permission="analytics.view"><LazyPage><AdminAnalytics /></LazyPage></ProtectedRoute>} />
      <Route path="packages" element={<ProtectedRoute permission="packages.view"><LazyPage><AdminPackages /></LazyPage></ProtectedRoute>} />
      <Route path="packages/:id" element={<ProtectedRoute permission="packages.view"><LazyPage><AdminPackageDetail /></LazyPage></ProtectedRoute>} />
      <Route path="departures" element={<ProtectedRoute permission="departures.view"><LazyPage><AdminDepartures /></LazyPage></ProtectedRoute>} />
      <Route path="equipment" element={<ProtectedRoute permission="operational.view"><LazyPage><EquipmentPage /></LazyPage></ProtectedRoute>} />
      <Route path="savings" element={<ProtectedRoute permission="packages.view"><LazyPage><AdminSavingsPlans /></LazyPage></ProtectedRoute>} />
      <Route path="master-data" element={<ProtectedRoute permission="master_data.view"><LazyPage><AdminMasterData /></LazyPage></ProtectedRoute>} />
      <Route path="branches" element={<ProtectedRoute permission="settings.view"><LazyPage><AdminBranches /></LazyPage></ProtectedRoute>} />
      <Route path="bookings" element={<ProtectedRoute permission="bookings.view_own"><LazyPage><AdminBookings /></LazyPage></ProtectedRoute>} />
      <Route path="bookings/create" element={<ProtectedRoute permission="bookings.create"><LazyPage><AdminBookingCreate /></LazyPage></ProtectedRoute>} />
      <Route path="bookings/:id" element={<ProtectedRoute permission="bookings.view_own"><LazyPage><AdminBookingDetail /></LazyPage></ProtectedRoute>} />
      <Route path="payments" element={<ProtectedRoute permission="payments.view_own"><LazyPage><AdminPayments /></LazyPage></ProtectedRoute>} />
      <Route path="finance" element={<ProtectedRoute permission="finance.reports"><LazyPage><AdminFinancePL /></LazyPage></ProtectedRoute>} />
      <Route path="finance-cash" element={<ProtectedRoute permission="payments.view_own"><LazyPage><AdminFinanceCash /></LazyPage></ProtectedRoute>} />
      <Route path="vendors" element={<ProtectedRoute permission="master_data.view"><LazyPage><AdminVendors /></LazyPage></ProtectedRoute>} />
      <Route path="customers" element={<ProtectedRoute permission="customers.view"><LazyPage><AdminCustomers /></LazyPage></ProtectedRoute>} />
      <Route path="customers/:id" element={<ProtectedRoute permission="customers.view"><LazyPage><AdminCustomerDetail /></LazyPage></ProtectedRoute>} />
      <Route path="document-verification" element={<ProtectedRoute permission="documents.verification.view"><LazyPage><AdminDocumentVerification /></LazyPage></ProtectedRoute>} />
      <Route path="users" element={<ProtectedRoute permission="users.view"><LazyPage><AdminUsers /></LazyPage></ProtectedRoute>} />

      <Route path="udac" element={<ProtectedRoute permission="users.view"><LazyPage><AdminUdacManagement /></LazyPage></ProtectedRoute>} />
      <Route path="udac/audit" element={<ProtectedRoute permission="users.view"><LazyPage><AdminUdacAudit /></LazyPage></ProtectedRoute>} />
      <Route path="udac/simulator" element={<ProtectedRoute permission="users.view"><LazyPage><AdminUdacSimulator /></LazyPage></ProtectedRoute>} />
      <Route path="agents" element={<ProtectedRoute permission="agents.view"><LazyPage><AdminAgents /></LazyPage></ProtectedRoute>} />
      <Route path="coupons" element={<ProtectedRoute permission="marketing.view"><LazyPage><AdminCoupons /></LazyPage></ProtectedRoute>} />
      <Route path="loyalty" element={<ProtectedRoute permission="marketing.view"><LazyPage><AdminLoyalty /></LazyPage></ProtectedRoute>} />
      <Route path="referrals" element={<ProtectedRoute permission="marketing.view"><LazyPage><AdminReferrals /></LazyPage></ProtectedRoute>} />
      <Route path="support" element={<ProtectedRoute permission="support.tickets.view"><LazyPage><AdminSupportTickets /></LazyPage></ProtectedRoute>} />
      <Route path="leads" element={<ProtectedRoute permission="leads.view"><LazyPage><AdminLeads /></LazyPage></ProtectedRoute>} />
      <Route path="leads/analytics" element={<ProtectedRoute permission="analytics.view"><LazyPage><AdminLeadAnalytics /></LazyPage></ProtectedRoute>} />
      <Route path="leads/:id" element={<ProtectedRoute permission="leads.view"><LazyPage><AdminLeadDetail /></LazyPage></ProtectedRoute>} />
      <Route path="room-assignments" element={<ProtectedRoute permission="operational.rooms.view"><LazyPage><AdminRoomAssignments /></LazyPage></ProtectedRoute>} />
      <Route path="reports" element={<ProtectedRoute permission="reports.view"><LazyPage><AdminReports /></LazyPage></ProtectedRoute>} />
      <Route path="advanced-reports" element={<ProtectedRoute permission="reports.view"><LazyPage><AdminAdvancedReports /></LazyPage></ProtectedRoute>} />
      <Route path="scheduled-reports" element={<ProtectedRoute permission="reports.view"><LazyPage><AdminScheduledReports /></LazyPage></ProtectedRoute>} />
      <Route path="hr" element={<ProtectedRoute permission="hr.employees.view"><LazyPage><AdminHR /></LazyPage></ProtectedRoute>} />
      <Route path="haji" element={<ProtectedRoute permission="operational.view"><LazyPage><AdminHajiManagement /></LazyPage></ProtectedRoute>} />
      <Route path="itinerary-templates" element={<ProtectedRoute permission="itinerary.view"><LazyPage><AdminItineraryTemplates /></LazyPage></ProtectedRoute>} />
      <Route path="offline-content" element={<ProtectedRoute permission="offline_content.view"><LazyPage><AdminOfflineContent /></LazyPage></ProtectedRoute>} />
      <Route path="documents-generator" element={<ProtectedRoute permission="documents.generator.view"><LazyPage><AdminDocumentGenerator /></LazyPage></ProtectedRoute>} />
      <Route path="security-audit" element={<ProtectedRoute permission="settings.manage"><LazyPage><AdminSecurityAudit /></LazyPage></ProtectedRoute>} />
      <Route path="2fa" element={<ProtectedRoute permission="settings.manage"><LazyPage><Admin2FASettings /></LazyPage></ProtectedRoute>} />
      <Route path="whatsapp" element={<ProtectedRoute permission="whatsapp.view"><LazyPage><AdminWhatsApp /></LazyPage></ProtectedRoute>} />
      <Route path="marketing-materials" element={<ProtectedRoute permission="marketing_materials.view"><LazyPage><AdminMarketingMaterials /></LazyPage></ProtectedRoute>} />
      <Route path="appearance" element={<ProtectedRoute permission="settings.manage"><LazyPage><AdminAppearance /></LazyPage></ProtectedRoute>} />
      <Route path="static-pages" element={<ProtectedRoute permission="settings.manage"><LazyPage><AdminStaticPages /></LazyPage></ProtectedRoute>} />
      <Route path="testimonials" element={<ProtectedRoute permission="settings.manage"><LazyPage><AdminTestimonials /></LazyPage></ProtectedRoute>} />
      <Route path="landing-pages" element={<ProtectedRoute permission="settings.manage"><LazyPage><AdminLandingPages /></LazyPage></ProtectedRoute>} />
      <Route path="landing-pages/:id" element={<ProtectedRoute permission="settings.manage"><LazyPage><AdminLandingPageEditor /></LazyPage></ProtectedRoute>} />
      <Route path="settings" element={<ProtectedRoute permission="settings.manage"><LazyPage><AdminSettings /></LazyPage></ProtectedRoute>} />
      <Route path="package-types" element={<ProtectedRoute permission="packages.view"><LazyPage><AdminPackageTypes /></LazyPage></ProtectedRoute>} />
      <Route path="finance/ar" element={<ProtectedRoute permission="payments.view_all"><LazyPage><AdminFinanceAR /></LazyPage></ProtectedRoute>} />
      <Route path="finance/ap" element={<ProtectedRoute permission="payments.view_all"><LazyPage><AdminFinanceAP /></LazyPage></ProtectedRoute>} />
      <Route path="hr/payroll" element={<ProtectedRoute permission="hr.payroll.view"><LazyPage><AdminPayroll /></LazyPage></ProtectedRoute>} />
      <Route path="manasik" element={<ProtectedRoute permission="operational.manasik.view"><LazyPage><AdminManasik /></LazyPage></ProtectedRoute>} />
      <Route path="visa" element={<ProtectedRoute permission="departures.visa.view"><LazyPage><AdminVisaManagement /></LazyPage></ProtectedRoute>} />
    </Route>
  );
}
