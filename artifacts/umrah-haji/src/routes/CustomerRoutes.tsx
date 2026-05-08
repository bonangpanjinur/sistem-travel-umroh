import { Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { LoadingState } from "@/components/shared/LoadingState";
import { AppRole } from "@/types/database";

const BookingPage = lazy(() => import("@/pages/booking/BookingPage"));
const BookingSuccess = lazy(() => import("@/pages/booking/BookingSuccess"));
const MyBookings = lazy(() => import("@/pages/customer/MyBookings"));
const BookingDetail = lazy(() => import("@/pages/customer/BookingDetail"));
const PaymentUpload = lazy(() => import("@/pages/customer/PaymentUpload"));
const MySavings = lazy(() => import("@/pages/customer/MySavings"));
const MyLoyalty = lazy(() => import("@/pages/customer/MyLoyalty"));
const CustomerDashboard = lazy(() => import("@/pages/customer/CustomerDashboard"));
const CustomerSupport = lazy(() => import("@/pages/customer/CustomerSupport"));
const CustomerSettings = lazy(() => import("@/pages/customer/CustomerSettings"));
const SavingsSuccess = lazy(() => import("@/pages/savings/SavingsSuccess"));
const JamaahPortal = lazy(() => import("@/pages/jamaah/JamaahPortal"));
const JamaahDigitalID = lazy(() => import("@/pages/jamaah/JamaahDigitalID"));
const JamaahDoaPanduan = lazy(() => import("@/pages/jamaah/JamaahDoaPanduan"));
const JamaahItinerary = lazy(() => import("@/pages/jamaah/JamaahItinerary"));
const JamaahDocuments = lazy(() => import("@/pages/jamaah/JamaahDocuments"));
const JamaahPaymentHistory = lazy(() => import("@/pages/jamaah/JamaahPaymentHistory"));
const JamaahFeedback = lazy(() => import("@/pages/jamaah/JamaahFeedback"));
const JamaahNotifications = lazy(() => import("@/pages/jamaah/JamaahNotifications"));
const JamaahVisaTracker = lazy(() => import("@/pages/jamaah/JamaahVisaTracker"));

/**
 * Role yang diizinkan mengakses portal jamaah/customer.
 * Staf admin internal (finance, sales, dll) tidak menggunakan portal ini —
 * mereka mengakses data jamaah via /admin/customers.
 * super_admin diizinkan untuk keperluan uji coba dan dukungan teknis.
 */
const CUSTOMER_PORTAL_ROLES: AppRole[] = ['customer', 'jamaah', 'super_admin'];

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingState />}>{children}</Suspense>;
}

function CustomerRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={CUSTOMER_PORTAL_ROLES}>
      <LazyPage>{children}</LazyPage>
    </ProtectedRoute>
  );
}

export default function CustomerRoutes() {
  return (
    <>
      {/* Dashboard & Pengaturan Customer */}
      <Route path="/customer/dashboard" element={<CustomerRoute><CustomerDashboard /></CustomerRoute>} />
      <Route path="/customer/support" element={<CustomerRoute><CustomerSupport /></CustomerRoute>} />
      <Route path="/customer/settings" element={<CustomerRoute><CustomerSettings /></CustomerRoute>} />
      <Route path="/customer/my-savings" element={<CustomerRoute><MySavings /></CustomerRoute>} />
      <Route path="/customer/my-loyalty" element={<CustomerRoute><MyLoyalty /></CustomerRoute>} />

      {/* Redirect lama */}
      <Route path="/customer/documents" element={<Navigate to="/jamaah/documents" replace />} />

      {/* Tabungan */}
      <Route path="/savings/success/:planId" element={<CustomerRoute><SavingsSuccess /></CustomerRoute>} />

      {/* Portal Jamaah */}
      <Route path="/jamaah" element={<CustomerRoute><JamaahPortal /></CustomerRoute>} />
      <Route path="/jamaah/digital-id" element={<CustomerRoute><JamaahDigitalID /></CustomerRoute>} />
      <Route path="/jamaah/doa-panduan" element={<CustomerRoute><JamaahDoaPanduan /></CustomerRoute>} />
      <Route path="/jamaah/itinerary" element={<CustomerRoute><JamaahItinerary /></CustomerRoute>} />
      <Route path="/jamaah/documents" element={<CustomerRoute><JamaahDocuments /></CustomerRoute>} />
      <Route path="/jamaah/payment-history" element={<CustomerRoute><JamaahPaymentHistory /></CustomerRoute>} />
      <Route path="/jamaah/feedback/:bookingId" element={<CustomerRoute><JamaahFeedback /></CustomerRoute>} />
      <Route path="/jamaah/notifications" element={<CustomerRoute><JamaahNotifications /></CustomerRoute>} />
      <Route path="/jamaah/visa" element={<CustomerRoute><JamaahVisaTracker /></CustomerRoute>} />

      {/* Booking — setiap user terautentikasi bisa booking */}
      <Route path="/booking/:packageId" element={<ProtectedRoute><LazyPage><BookingPage /></LazyPage></ProtectedRoute>} />
      <Route path="/booking/success/:bookingId" element={<ProtectedRoute><LazyPage><BookingSuccess /></LazyPage></ProtectedRoute>} />
      <Route path="/my-bookings" element={<ProtectedRoute><LazyPage><MyBookings /></LazyPage></ProtectedRoute>} />
      <Route path="/my-bookings/:bookingId" element={<ProtectedRoute><LazyPage><BookingDetail /></LazyPage></ProtectedRoute>} />
      <Route path="/my-bookings/:bookingId/payment" element={<ProtectedRoute><LazyPage><PaymentUpload /></LazyPage></ProtectedRoute>} />
    </>
  );
}
