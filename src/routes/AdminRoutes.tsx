import { Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AdminLayout from "@/components/admin/AdminLayoutDynamicImproved";
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
// const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminAgents = lazy(() => import("@/pages/admin/AdminAgents"));
const AdminReports = lazy(() => import("@/pages/admin/AdminReports"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminPackageTypes = lazy(() => import("@/pages/admin/AdminPackageTypes"));
const AdminMasterData = lazy(() => import("@/pages/admin/AdminMasterData"));
const AdminLeads = lazy(() => import("@/pages/admin/AdminLeads"));
const AdminLeadDetail = lazy(() => import("@/pages/admin/AdminLeadDetail"));
const AdminLeadAnalytics = lazy(() => import("@/pages/admin/AdminLeadAnalytics"));

// const AdminUdacManagement = lazy(() => import("@/pages/admin/AdminUdacManagement"));
// const AdminUdacAudit = lazy(() => import("@/pages/admin/AdminUdacAudit"));
// const AdminUdacSimulator = lazy(() => import("@/pages/admin/AdminUdacSimulator"));
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
// const AdminSecurityAudit = lazy(() => import("@/pages/admin/AdminSecurityAudit"));
// const Admin2FASettings = lazy(() => import("@/pages/admin/Admin2FASettings"));
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
      <Route index element={<LazyPage><AdminDashboard /></LazyPage>} />
      <Route path="analytics" element={<LazyPage><AdminAnalytics /></LazyPage>} />
      <Route path="packages" element={<LazyPage><AdminPackages /></LazyPage>} />
      <Route path="packages/:id" element={<LazyPage><AdminPackageDetail /></LazyPage>} />
      <Route path="departures" element={<LazyPage><AdminDepartures /></LazyPage>} />
      <Route path="equipment" element={<LazyPage><EquipmentPage /></LazyPage>} />
      <Route path="savings" element={<LazyPage><AdminSavingsPlans /></LazyPage>} />
      <Route path="master-data" element={<LazyPage><AdminMasterData /></LazyPage>} />
      <Route path="branches" element={<LazyPage><AdminBranches /></LazyPage>} />
      <Route path="bookings" element={<LazyPage><AdminBookings /></LazyPage>} />
      <Route path="bookings/create" element={<LazyPage><AdminBookingCreate /></LazyPage>} />
      <Route path="bookings/:id" element={<LazyPage><AdminBookingDetail /></LazyPage>} />
      <Route path="payments" element={<LazyPage><AdminPayments /></LazyPage>} />
      <Route path="finance" element={<LazyPage><AdminFinancePL /></LazyPage>} />
      <Route path="finance-cash" element={<LazyPage><AdminFinanceCash /></LazyPage>} />
      <Route path="vendors" element={<LazyPage><AdminVendors /></LazyPage>} />
      <Route path="customers" element={<LazyPage><AdminCustomers /></LazyPage>} />
      <Route path="customers/:id" element={<LazyPage><AdminCustomerDetail /></LazyPage>} />
      <Route path="document-verification" element={<LazyPage><AdminDocumentVerification /></LazyPage>} />
      {/* <Route path="users" element={<LazyPage><AdminUsers /></LazyPage>} /> */}

      {/* UDAC routes disabled due to missing components */}
      {/* <Route path="udac" element={<ProtectedRoute permission="users.view"><LazyPage><AdminUdacManagement /></LazyPage></ProtectedRoute>} /> */}
      {/* <Route path="udac/audit" element={<ProtectedRoute permission="users.view"><LazyPage><AdminUdacAudit /></LazyPage></ProtectedRoute>} /> */}
      {/* <Route path="udac/simulator" element={<ProtectedRoute permission="users.view"><LazyPage><AdminUdacSimulator /></LazyPage></ProtectedRoute>} /> */}
      <Route path="agents" element={<LazyPage><AdminAgents /></LazyPage>} />
      <Route path="coupons" element={<LazyPage><AdminCoupons /></LazyPage>} />
      <Route path="loyalty" element={<LazyPage><AdminLoyalty /></LazyPage>} />
      <Route path="referrals" element={<LazyPage><AdminReferrals /></LazyPage>} />
      <Route path="support" element={<LazyPage><AdminSupportTickets /></LazyPage>} />
      <Route path="leads" element={<LazyPage><AdminLeads /></LazyPage>} />
      <Route path="leads/analytics" element={<LazyPage><AdminLeadAnalytics /></LazyPage>} />
      <Route path="leads/:id" element={<LazyPage><AdminLeadDetail /></LazyPage>} />
      <Route path="room-assignments" element={<LazyPage><AdminRoomAssignments /></LazyPage>} />
      <Route path="reports" element={<LazyPage><AdminReports /></LazyPage>} />
      <Route path="advanced-reports" element={<LazyPage><AdminAdvancedReports /></LazyPage>} />
      <Route path="scheduled-reports" element={<LazyPage><AdminScheduledReports /></LazyPage>} />
      <Route path="hr" element={<LazyPage><AdminHR /></LazyPage>} />
      <Route path="haji" element={<LazyPage><AdminHajiManagement /></LazyPage>} />
      <Route path="itinerary-templates" element={<LazyPage><AdminItineraryTemplates /></LazyPage>} />
      <Route path="offline-content" element={<LazyPage><AdminOfflineContent /></LazyPage>} />
      <Route path="documents-generator" element={<LazyPage><AdminDocumentGenerator /></LazyPage>} />
      {/* <Route path="security-audit" element={<LazyPage><AdminSecurityAudit /></LazyPage>} /> */}
      {/* <Route path="2fa" element={<LazyPage><Admin2FASettings /></LazyPage>} /> */}
      <Route path="whatsapp" element={<LazyPage><AdminWhatsApp /></LazyPage>} />
      <Route path="marketing-materials" element={<LazyPage><AdminMarketingMaterials /></LazyPage>} />
      <Route path="appearance" element={<LazyPage><AdminAppearance /></LazyPage>} />
      <Route path="static-pages" element={<LazyPage><AdminStaticPages /></LazyPage>} />
      <Route path="testimonials" element={<LazyPage><AdminTestimonials /></LazyPage>} />
      <Route path="landing-pages" element={<LazyPage><AdminLandingPages /></LazyPage>} />
      <Route path="landing-pages/:id" element={<LazyPage><AdminLandingPageEditor /></LazyPage>} />
      <Route path="settings" element={<LazyPage><AdminSettings /></LazyPage>} />
      <Route path="package-types" element={<LazyPage><AdminPackageTypes /></LazyPage>} />
      <Route path="finance/ar" element={<LazyPage><AdminFinanceAR /></LazyPage>} />
      <Route path="finance/ap" element={<LazyPage><AdminFinanceAP /></LazyPage>} />
      <Route path="hr/payroll" element={<LazyPage><AdminPayroll /></LazyPage>} />
      <Route path="manasik" element={<LazyPage><AdminManasik /></LazyPage>} />
      <Route path="visa" element={<LazyPage><AdminVisaManagement /></LazyPage>} />
    </Route>
  );
}
