import { Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { LoadingState } from "@/components/shared/LoadingState";

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

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingState />}>{children}</Suspense>;
}

export default function CustomerRoutes() {
  return (
    <>
      <Route path="/customer/dashboard" element={<ProtectedRoute><LazyPage><CustomerDashboard /></LazyPage></ProtectedRoute>} />
      <Route path="/customer/support" element={<ProtectedRoute><LazyPage><CustomerSupport /></LazyPage></ProtectedRoute>} />
      <Route path="/customer/settings" element={<ProtectedRoute><LazyPage><CustomerSettings /></LazyPage></ProtectedRoute>} />
      <Route path="/savings/success/:planId" element={<ProtectedRoute><LazyPage><SavingsSuccess /></LazyPage></ProtectedRoute>} />
      <Route path="/customer/my-savings" element={<ProtectedRoute><LazyPage><MySavings /></LazyPage></ProtectedRoute>} />
      <Route path="/customer/my-loyalty" element={<ProtectedRoute><LazyPage><MyLoyalty /></LazyPage></ProtectedRoute>} />
      <Route path="/jamaah" element={<ProtectedRoute><LazyPage><JamaahPortal /></LazyPage></ProtectedRoute>} />
      <Route path="/jamaah/digital-id" element={<ProtectedRoute><LazyPage><JamaahDigitalID /></LazyPage></ProtectedRoute>} />
      <Route path="/jamaah/doa-panduan" element={<ProtectedRoute><LazyPage><JamaahDoaPanduan /></LazyPage></ProtectedRoute>} />
      <Route path="/jamaah/itinerary" element={<ProtectedRoute><LazyPage><JamaahItinerary /></LazyPage></ProtectedRoute>} />
      <Route path="/jamaah/documents" element={<ProtectedRoute><LazyPage><JamaahDocuments /></LazyPage></ProtectedRoute>} />
      <Route path="/customer/documents" element={<ProtectedRoute><LazyPage><JamaahDocuments /></LazyPage></ProtectedRoute>} />
      <Route path="/jamaah/payment-history" element={<ProtectedRoute><LazyPage><JamaahPaymentHistory /></LazyPage></ProtectedRoute>} />
      <Route path="/jamaah/feedback/:bookingId" element={<ProtectedRoute><LazyPage><JamaahFeedback /></LazyPage></ProtectedRoute>} />
      <Route path="/jamaah/notifications" element={<ProtectedRoute><LazyPage><JamaahNotifications /></LazyPage></ProtectedRoute>} />
      <Route path="/jamaah/visa" element={<ProtectedRoute><LazyPage><JamaahVisaTracker /></LazyPage></ProtectedRoute>} />
      <Route path="/booking/:packageId" element={<ProtectedRoute><LazyPage><BookingPage /></LazyPage></ProtectedRoute>} />
      <Route path="/booking/success/:bookingId" element={<ProtectedRoute><LazyPage><BookingSuccess /></LazyPage></ProtectedRoute>} />
      <Route path="/my-bookings" element={<ProtectedRoute><LazyPage><MyBookings /></LazyPage></ProtectedRoute>} />
      <Route path="/my-bookings/:bookingId" element={<ProtectedRoute><LazyPage><BookingDetail /></LazyPage></ProtectedRoute>} />
      <Route path="/my-bookings/:bookingId/payment" element={<ProtectedRoute><LazyPage><PaymentUpload /></LazyPage></ProtectedRoute>} />
    </>
  );
}
