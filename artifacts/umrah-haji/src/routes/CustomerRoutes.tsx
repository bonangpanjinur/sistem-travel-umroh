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
const JamaahPanduanIbadah = lazy(() => import("@/pages/jamaah/JamaahPanduanIbadah"));
const JamaahPetaLokasi = lazy(() => import("@/pages/jamaah/JamaahPetaLokasi"));
const KalkulatorCicilan = lazy(() => import("@/pages/customer/KalkulatorCicilan"));

// Fase 2 — Fitur Inti Jamaah
const JamaahWaktuSholat = lazy(() => import("@/pages/jamaah/JamaahWaktuSholat"));
const JamaahInvoice = lazy(() => import("@/pages/jamaah/JamaahInvoice"));
const JamaahKalkulatorKurs = lazy(() => import("@/pages/jamaah/JamaahKalkulatorKurs"));
const JamaahWelcome = lazy(() => import("@/pages/jamaah/JamaahWelcome"));

// Fase 3 — Fitur Sosial & Komunitas
const JamaahChat = lazy(() => import("@/pages/jamaah/JamaahChat"));
const JamaahRombongan = lazy(() => import("@/pages/jamaah/JamaahRombongan"));
const JamaahGaleri = lazy(() => import("@/pages/jamaah/JamaahGaleri"));
const JamaahRiwayatPerjalanan = lazy(() => import("@/pages/jamaah/JamaahRiwayatPerjalanan"));
const JamaahReferral = lazy(() => import("@/pages/jamaah/JamaahReferral"));

// Fase 4 — Fitur Finansial & Spiritual
const JamaahKalkulatorZakat = lazy(() => import("@/pages/jamaah/JamaahKalkulatorZakat"));

// Fase 5 — Operasional & Self-Service
const JamaahCheckin = lazy(() => import("@/pages/jamaah/JamaahCheckin"));
const JamaahBagasi = lazy(() => import("@/pages/jamaah/JamaahBagasi"));
const JamaahKontrak = lazy(() => import("@/pages/jamaah/JamaahKontrak"));

// Fase 7 — Manajemen Operasional Muthawif
const MuthawifDashboard = lazy(() => import("@/pages/muthawif/MuthawifDashboard"));
const MuthawifLaporanHarian = lazy(() => import("@/pages/muthawif/MuthawifLaporanHarian"));

// Fase 8 — Engagement & Gamifikasi Jamaah
const JamaahBadges = lazy(() => import("@/pages/jamaah/JamaahBadges"));
const JamaahTargetIbadah = lazy(() => import("@/pages/jamaah/JamaahTargetIbadah"));
const JamaahJurnal = lazy(() => import("@/pages/jamaah/JamaahJurnal"));
const JamaahDoaCounter = lazy(() => import("@/pages/jamaah/JamaahDoaCounter"));
const JamaahSertifikat = lazy(() => import("@/pages/jamaah/JamaahSertifikat"));

// Fase 9 — Integrasi & Otomasi
const JamaahSISKOHAT = lazy(() => import("@/pages/jamaah/JamaahSISKOHAT"));

// Fase 10 — AI & Smart Analytics
const JamaahChatbot = lazy(() => import("@/pages/jamaah/JamaahChatbot"));
const JamaahRingkasanAI = lazy(() => import("@/pages/jamaah/JamaahRingkasanAI"));

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
      <Route path="/jamaah/panduan-ibadah" element={<CustomerRoute><Suspense fallback={<LoadingState />}><JamaahPanduanIbadah /></Suspense></CustomerRoute>} />
      <Route path="/jamaah/peta-lokasi" element={<CustomerRoute><JamaahPetaLokasi /></CustomerRoute>} />

      {/* Fase 2 — Fitur Inti Jamaah */}
      <Route path="/jamaah/waktu-sholat" element={<CustomerRoute><JamaahWaktuSholat /></CustomerRoute>} />
      <Route path="/jamaah/invoice/:bookingId" element={<CustomerRoute><JamaahInvoice /></CustomerRoute>} />
      <Route path="/jamaah/kalkulator-kurs" element={<CustomerRoute><JamaahKalkulatorKurs /></CustomerRoute>} />
      <Route path="/jamaah/welcome" element={<CustomerRoute><JamaahWelcome /></CustomerRoute>} />

      {/* Fase 3 — Fitur Sosial & Komunitas */}
      <Route path="/jamaah/chat" element={<CustomerRoute><JamaahChat /></CustomerRoute>} />
      <Route path="/jamaah/rombongan" element={<CustomerRoute><JamaahRombongan /></CustomerRoute>} />
      <Route path="/jamaah/galeri" element={<CustomerRoute><JamaahGaleri /></CustomerRoute>} />
      <Route path="/jamaah/riwayat-perjalanan" element={<CustomerRoute><JamaahRiwayatPerjalanan /></CustomerRoute>} />
      <Route path="/jamaah/referral" element={<CustomerRoute><JamaahReferral /></CustomerRoute>} />

      {/* Fase 4 — Fitur Finansial & Spiritual */}
      <Route path="/jamaah/kalkulator-zakat" element={<CustomerRoute><JamaahKalkulatorZakat /></CustomerRoute>} />

      {/* Fase 5 — Operasional & Self-Service */}
      <Route path="/jamaah/checkin" element={<CustomerRoute><JamaahCheckin /></CustomerRoute>} />
      <Route path="/jamaah/bagasi" element={<CustomerRoute><JamaahBagasi /></CustomerRoute>} />
      <Route path="/jamaah/kontrak" element={<CustomerRoute><JamaahKontrak /></CustomerRoute>} />

      {/* Fase 8 — Engagement & Gamifikasi Jamaah */}
      <Route path="/jamaah/badges" element={<CustomerRoute><JamaahBadges /></CustomerRoute>} />
      <Route path="/jamaah/target-ibadah" element={<CustomerRoute><JamaahTargetIbadah /></CustomerRoute>} />
      <Route path="/jamaah/jurnal" element={<CustomerRoute><JamaahJurnal /></CustomerRoute>} />
      <Route path="/jamaah/doa-counter" element={<CustomerRoute><JamaahDoaCounter /></CustomerRoute>} />
      <Route path="/jamaah/sertifikat" element={<CustomerRoute><JamaahSertifikat /></CustomerRoute>} />

      {/* Fase 9 — Integrasi & Otomasi */}
      <Route path="/jamaah/siskohat" element={<CustomerRoute><JamaahSISKOHAT /></CustomerRoute>} />

      {/* Fase 10 — AI & Smart Analytics */}
      <Route path="/jamaah/chatbot" element={<CustomerRoute><JamaahChatbot /></CustomerRoute>} />
      <Route path="/jamaah/ringkasan-ai" element={<CustomerRoute><JamaahRingkasanAI /></CustomerRoute>} />

      {/* Fase 7 — Dashboard Muthawif */}
      <Route path="/muthawif/dashboard" element={
        <ProtectedRoute allowedRoles={['super_admin', 'owner', 'operational', 'branch_manager']}>
          <LazyPage><MuthawifDashboard /></LazyPage>
        </ProtectedRoute>
      } />
      <Route path="/muthawif/laporan-harian" element={
        <ProtectedRoute allowedRoles={['super_admin', 'owner', 'operational', 'branch_manager']}>
          <LazyPage><MuthawifLaporanHarian /></LazyPage>
        </ProtectedRoute>
      } />

      {/* Booking — setiap user terautentikasi bisa booking */}
      <Route path="/booking/:packageId" element={<ProtectedRoute><LazyPage><BookingPage /></LazyPage></ProtectedRoute>} />
      <Route path="/booking/success/:bookingId" element={<ProtectedRoute><LazyPage><BookingSuccess /></LazyPage></ProtectedRoute>} />
      <Route path="/my-bookings" element={<ProtectedRoute><LazyPage><MyBookings /></LazyPage></ProtectedRoute>} />
      <Route path="/my-bookings/:bookingId" element={<ProtectedRoute><LazyPage><BookingDetail /></LazyPage></ProtectedRoute>} />
      <Route path="/my-bookings/:bookingId/payment" element={<ProtectedRoute><LazyPage><PaymentUpload /></LazyPage></ProtectedRoute>} />
    </>
  );
}
