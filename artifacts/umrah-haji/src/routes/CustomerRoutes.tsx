import { Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import JamaahPrivateGate from "@/components/auth/JamaahPrivateGate";
import { LoadingState } from "@/components/shared/LoadingState";
import { AppRole } from "@/types/database";

const BookingPage = lazy(() => import("@/pages/booking/BookingPage"));
const BookingSuccess = lazy(() => import("@/pages/booking/BookingSuccess"));
const BookingRecover = lazy(() => import("@/pages/booking/BookingRecover"));
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
const JamaahDoaPanduan = lazy(() => import("@/pages/jamaah/ibadah/JamaahDoaPanduan"));
const JamaahItinerary = lazy(() => import("@/pages/jamaah/JamaahItinerary"));
const JamaahDocuments = lazy(() => import("@/pages/jamaah/JamaahDocuments"));
const JamaahPaymentHistory = lazy(() => import("@/pages/jamaah/JamaahPaymentHistory"));
const JamaahFeedback = lazy(() => import("@/pages/jamaah/JamaahFeedback"));
const JamaahNotifications = lazy(() => import("@/pages/jamaah/JamaahNotifications"));
const JamaahVisaTracker = lazy(() => import("@/pages/jamaah/JamaahVisaTracker"));
const JamaahPanduanIbadah = lazy(() => import("@/pages/jamaah/ibadah/JamaahPanduanIbadah"));
const JamaahPetaLokasi = lazy(() => import("@/pages/jamaah/JamaahPetaLokasi"));
const KalkulatorCicilan = lazy(() => import("@/pages/customer/KalkulatorCicilan"));
const CustomerRefundStatus = lazy(() => import("@/pages/customer/CustomerRefundStatus"));

// Fase 2 — Fitur Inti Jamaah
const JamaahWaktuSholat = lazy(() => import("@/pages/jamaah/JamaahWaktuSholat"));
const JamaahInvoice = lazy(() => import("@/pages/jamaah/JamaahInvoice"));
const JamaahKalkulatorKurs = lazy(() => import("@/pages/jamaah/JamaahKalkulatorKurs"));
const JamaahWelcome = lazy(() => import("@/pages/jamaah/JamaahWelcome"));

// Fase 4 — Modul Ibadah Baru
const JamaahKiblat = lazy(() => import("@/pages/jamaah/JamaahKiblat"));
const JamaahAlQuran = lazy(() => import("@/pages/jamaah/JamaahAlQuran"));
const JamaahZikir = lazy(() => import("@/pages/jamaah/ibadah/JamaahZikir"));

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
const MuthawifJamaahProfil = lazy(() => import("@/pages/muthawif/MuthawifJamaahProfil"));
const MuthawifSOS = lazy(() => import("@/pages/muthawif/MuthawifSOS"));
// N5 — Penilaian Jamaah oleh Muthawif
const MuthawifPenilaianJamaah = lazy(() => import("@/pages/muthawif/MuthawifPenilaianJamaah"));

// FITUR 01 — SOS Real-time Jamaah
const JamaahSOSStatus = lazy(() => import("@/pages/jamaah/JamaahSOSStatus"));

// Fase 8 — Engagement & Gamifikasi Jamaah
const JamaahBadges = lazy(() => import("@/pages/jamaah/JamaahBadges"));
const JamaahProgressWall = lazy(() => import("@/pages/jamaah/JamaahProgressWall"));
const JamaahTargetIbadah = lazy(() => import("@/pages/jamaah/ibadah/JamaahTargetIbadah"));
const JamaahJurnal = lazy(() => import("@/pages/jamaah/JamaahJurnal"));
const JamaahDoaCounter = lazy(() => import("@/pages/jamaah/ibadah/JamaahDoaCounter"));
const JamaahSertifikat = lazy(() => import("@/pages/jamaah/JamaahSertifikat"));

// Fase 9 — Integrasi & Otomasi
const JamaahSISKOHAT = lazy(() => import("@/pages/jamaah/JamaahSISKOHAT"));

// Fase 10 — AI & Smart Analytics
const JamaahChatbot = lazy(() => import("@/pages/jamaah/JamaahChatbot"));
const JamaahRingkasanAI = lazy(() => import("@/pages/jamaah/JamaahRingkasanAI"));

// Fase 11 — Pembayaran & Dokumen Mandiri
const JamaahPayment = lazy(() => import("@/pages/jamaah/JamaahPayment"));
const JamaahChecklist = lazy(() => import("@/pages/jamaah/JamaahChecklist"));

// Fase 15 — Manasik Digital
const JamaahManasik = lazy(() => import("@/pages/jamaah/ibadah/JamaahManasik"));
const JamaahManasikInteraktif = lazy(() => import("@/pages/jamaah/ibadah/JamaahManasikInteraktif"));

// Fase 2 UX — Fitur Baru
const JamaahKesehatan = lazy(() => import("@/pages/jamaah/JamaahKesehatan"));
const JamaahTrackerIbadah = lazy(() => import("@/pages/jamaah/ibadah/JamaahTrackerIbadah"));

// Pengingat Ibadah — push notification lokal
const JamaahPengingatIbadah = lazy(() => import("@/pages/jamaah/ibadah/JamaahPengingatIbadah"));

// P15 — Pantau Keluarga
const JamaahPantauKeluarga = lazy(() => import("@/pages/jamaah/JamaahPantauKeluarga"));

// Wishlist Paket
const JamaahWishlist = lazy(() => import("@/pages/jamaah/JamaahWishlist"));

// Live Audio — Siaran Muthawif & Tour Leader
const LiveAudioPage = lazy(() => import("@/pages/audio/LiveAudioPage"));
const JamaahSignaturePage = lazy(() => import("@/pages/jamaah/JamaahSignaturePage"));

// Tour Guide System — Fase 1
const TourLeaderDashboard  = lazy(() => import("@/pages/tour-leader/TourLeaderDashboard"));
const TourLeaderBroadcast  = lazy(() => import("@/pages/tour-leader/TourLeaderBroadcast"));
const TourLeaderAttendance = lazy(() => import("@/pages/tour-leader/TourLeaderAttendance"));
const JamaahTransmisi      = lazy(() => import("@/pages/jamaah/JamaahTransmisi"));
const JamaahAbsensi        = lazy(() => import("@/pages/jamaah/JamaahAbsensi"));

// Tour Guide System — Fase 2: Program Live & Lokasi
const TourLeaderProgram    = lazy(() => import("@/pages/tour-leader/TourLeaderProgram"));
const TourLeaderMap        = lazy(() => import("@/pages/tour-leader/TourLeaderMap"));
const JamaahProgramLive    = lazy(() => import("@/pages/jamaah/JamaahProgramLive"));
const JamaahLokasiGuide    = lazy(() => import("@/pages/jamaah/JamaahLokasiGuide"));
const MuthawifBroadcast    = lazy(() => import("@/pages/muthawif/MuthawifBroadcast"));
const MuthawifAbsensiSesi  = lazy(() => import("@/pages/muthawif/MuthawifAbsensiSesi"));

// Toko Online / E-Commerce
const StorePage        = lazy(() => import("@/pages/customer/StorePage"));
const StoreCheckout    = lazy(() => import("@/pages/customer/StoreCheckout"));
const MyStoreOrders    = lazy(() => import("@/pages/customer/MyStoreOrders"));
const StoreOrderDetail = lazy(() => import("@/pages/customer/StoreOrderDetail"));

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

/**
 * Soft-gated route for /jamaah/* private features.
 * - Guests see a friendly "Masuk untuk melanjutkan" panel (no redirect).
 * - Signed-in users see the page directly.
 * Use this instead of CustomerRoute for jamaah personal features so that
 * installing the PWA never feels like an "Access Denied" wall.
 */
function JamaahRoute({ children }: { children: React.ReactNode }) {
  return (
    <JamaahPrivateGate>
      <LazyPage>{children}</LazyPage>
    </JamaahPrivateGate>
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

      {/* ── Portal Jamaah — PUBLIK, mendukung mode tamu (PWA-friendly) ── */}
      <Route path="/jamaah" element={<LazyPage><JamaahPortal /></LazyPage>} />
      <Route path="/jamaah/welcome" element={<LazyPage><JamaahWelcome /></LazyPage>} />
      <Route path="/jamaah/chatbot" element={<LazyPage><JamaahChatbot /></LazyPage>} />

      {/* ── Fitur Pribadi Jamaah — soft prompt login (bukan access denied) ── */}
      <Route path="/jamaah/digital-id" element={<JamaahRoute><JamaahDigitalID /></JamaahRoute>} />
      <Route path="/jamaah/itinerary" element={<JamaahRoute><JamaahItinerary /></JamaahRoute>} />
      <Route path="/jamaah/documents" element={<JamaahRoute><JamaahDocuments /></JamaahRoute>} />
      <Route path="/jamaah/payment-history" element={<JamaahRoute><JamaahPaymentHistory /></JamaahRoute>} />
      <Route path="/jamaah/feedback/:bookingId" element={<JamaahRoute><JamaahFeedback /></JamaahRoute>} />
      <Route path="/jamaah/notifications" element={<JamaahRoute><JamaahNotifications /></JamaahRoute>} />
      <Route path="/jamaah/visa" element={<JamaahRoute><JamaahVisaTracker /></JamaahRoute>} />
      <Route path="/jamaah/chat" element={<JamaahRoute><JamaahChat /></JamaahRoute>} />
      <Route path="/jamaah/rombongan" element={<JamaahRoute><JamaahRombongan /></JamaahRoute>} />
      <Route path="/jamaah/galeri" element={<JamaahRoute><JamaahGaleri /></JamaahRoute>} />
      <Route path="/jamaah/riwayat-perjalanan" element={<JamaahRoute><JamaahRiwayatPerjalanan /></JamaahRoute>} />
      <Route path="/jamaah/referral" element={<JamaahRoute><JamaahReferral /></JamaahRoute>} />
      <Route path="/jamaah/invoice/:bookingId" element={<JamaahRoute><JamaahInvoice /></JamaahRoute>} />
      <Route path="/jamaah/checkin" element={<JamaahRoute><JamaahCheckin /></JamaahRoute>} />
      <Route path="/jamaah/bagasi" element={<JamaahRoute><JamaahBagasi /></JamaahRoute>} />
      <Route path="/jamaah/kontrak" element={<JamaahRoute><JamaahKontrak /></JamaahRoute>} />
      <Route path="/jamaah/badges" element={<JamaahRoute><JamaahBadges /></JamaahRoute>} />
      <Route path="/jamaah/progress-wall" element={<JamaahRoute><JamaahProgressWall /></JamaahRoute>} />
      <Route path="/jamaah/jurnal" element={<JamaahRoute><JamaahJurnal /></JamaahRoute>} />
      <Route path="/jamaah/sertifikat" element={<JamaahRoute><JamaahSertifikat /></JamaahRoute>} />
      <Route path="/jamaah/siskohat" element={<JamaahRoute><JamaahSISKOHAT /></JamaahRoute>} />
      <Route path="/jamaah/ringkasan-ai" element={<JamaahRoute><JamaahRingkasanAI /></JamaahRoute>} />
      <Route path="/jamaah/payment" element={<JamaahRoute><JamaahPayment /></JamaahRoute>} />
      <Route path="/jamaah/kesehatan" element={<JamaahRoute><JamaahKesehatan /></JamaahRoute>} />
      <Route path="/jamaah/sos-status" element={<JamaahRoute><JamaahSOSStatus /></JamaahRoute>} />
      <Route path="/jamaah/pantau-keluarga" element={<JamaahRoute><JamaahPantauKeluarga /></JamaahRoute>} />
      <Route path="/jamaah/tanda-tangan" element={<JamaahRoute><JamaahSignaturePage /></JamaahRoute>} />

      {/* ── Konten Islami & Alat Ibadah — PUBLIK, tidak perlu login ── */}
      <Route path="/jamaah/doa-panduan" element={<LazyPage><JamaahDoaPanduan /></LazyPage>} />
      <Route path="/jamaah/panduan-ibadah" element={<LazyPage><JamaahPanduanIbadah /></LazyPage>} />
      <Route path="/jamaah/peta-lokasi" element={<LazyPage><JamaahPetaLokasi /></LazyPage>} />
      <Route path="/jamaah/waktu-sholat" element={<LazyPage><JamaahWaktuSholat /></LazyPage>} />
      <Route path="/jamaah/kalkulator-kurs" element={<LazyPage><JamaahKalkulatorKurs /></LazyPage>} />
      <Route path="/jamaah/kalkulator-zakat" element={<LazyPage><JamaahKalkulatorZakat /></LazyPage>} />
      <Route path="/jamaah/doa-counter" element={<LazyPage><JamaahDoaCounter /></LazyPage>} />
      <Route path="/jamaah/manasik" element={<LazyPage><JamaahManasik /></LazyPage>} />
      <Route path="/jamaah/manasik-interaktif" element={<LazyPage><JamaahManasikInteraktif /></LazyPage>} />
      <Route path="/jamaah/tracker-ibadah" element={<LazyPage><JamaahTrackerIbadah /></LazyPage>} />
      <Route path="/jamaah/target-ibadah" element={<LazyPage><JamaahTargetIbadah /></LazyPage>} />
      <Route path="/jamaah/checklist" element={<LazyPage><JamaahChecklist /></LazyPage>} />
      <Route path="/jamaah/pengingat-ibadah" element={<LazyPage><JamaahPengingatIbadah /></LazyPage>} />
      <Route path="/jamaah/kiblat" element={<LazyPage><JamaahKiblat /></LazyPage>} />
      <Route path="/jamaah/al-quran" element={<LazyPage><JamaahAlQuran /></LazyPage>} />
      <Route path="/jamaah/zikir" element={<LazyPage><JamaahZikir /></LazyPage>} />

      {/* Toko Online / E-Commerce */}
      <Route path="/store"                   element={<LazyPage><StorePage /></LazyPage>} />
      <Route path="/store/checkout"          element={<CustomerRoute><StoreCheckout /></CustomerRoute>} />
      <Route path="/store/orders"            element={<CustomerRoute><MyStoreOrders /></CustomerRoute>} />
      <Route path="/store/orders/:id"        element={<CustomerRoute><StoreOrderDetail /></CustomerRoute>} />

      {/* FITUR 04 — Status Pengajuan Refund/Pembatalan Customer */}
      <Route path="/customer/refund-status" element={<CustomerRoute><LazyPage><CustomerRefundStatus /></LazyPage></CustomerRoute>} />

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
      <Route path="/muthawif/jamaah/:customerId" element={
        <ProtectedRoute allowedRoles={['super_admin', 'owner', 'operational', 'branch_manager']}>
          <LazyPage><MuthawifJamaahProfil /></LazyPage>
        </ProtectedRoute>
      } />
      {/* FITUR 01 — SOS Panel Muthawif */}
      <Route path="/muthawif/sos" element={
        <ProtectedRoute allowedRoles={['super_admin', 'owner', 'operational', 'branch_manager']}>
          <LazyPage><MuthawifSOS /></LazyPage>
        </ProtectedRoute>
      } />
      {/* N5 — Penilaian Jamaah oleh Muthawif */}
      <Route path="/muthawif/penilaian" element={
        <ProtectedRoute allowedRoles={['super_admin', 'owner', 'operational', 'branch_manager']}>
          <LazyPage><MuthawifPenilaianJamaah /></LazyPage>
        </ProtectedRoute>
      } />

      {/* Wishlist Paket */}
      <Route path="/jamaah/wishlist" element={<CustomerRoute><JamaahWishlist /></CustomerRoute>} />

      {/* Live Audio — Siaran suara muthawif / tour leader */}
      <Route path="/jamaah/siaran" element={
        <ProtectedRoute allowedRoles={['customer', 'jamaah', 'super_admin']}>
          <LazyPage><LiveAudioPage mode="listener" /></LazyPage>
        </ProtectedRoute>
      } />
      <Route path="/muthawif/siaran" element={
        <ProtectedRoute allowedRoles={['super_admin', 'owner', 'operational', 'branch_manager']}>
          <LazyPage><LiveAudioPage mode="speaker" /></LazyPage>
        </ProtectedRoute>
      } />
      <Route path="/tour-leader/siaran" element={
        <ProtectedRoute allowedRoles={['super_admin', 'owner', 'operational', 'branch_manager']}>
          <LazyPage><LiveAudioPage mode="controller" /></LazyPage>
        </ProtectedRoute>
      } />

      {/* Tour Guide System — Fase 1: Portal Tour Leader */}
      <Route path="/tour-leader" element={
        <ProtectedRoute allowedRoles={['super_admin', 'owner', 'operational', 'branch_manager']}>
          <LazyPage><TourLeaderDashboard /></LazyPage>
        </ProtectedRoute>
      } />
      <Route path="/tour-leader/broadcast" element={
        <ProtectedRoute allowedRoles={['super_admin', 'owner', 'operational', 'branch_manager']}>
          <LazyPage><TourLeaderBroadcast /></LazyPage>
        </ProtectedRoute>
      } />
      <Route path="/tour-leader/attendance" element={
        <ProtectedRoute allowedRoles={['super_admin', 'owner', 'operational', 'branch_manager']}>
          <LazyPage><TourLeaderAttendance /></LazyPage>
        </ProtectedRoute>
      } />

      {/* Tour Guide System — Fase 1: Sisi Jamaah */}
      <Route path="/jamaah/transmisi" element={<JamaahRoute><JamaahTransmisi /></JamaahRoute>} />
      <Route path="/jamaah/absensi"   element={<JamaahRoute><JamaahAbsensi /></JamaahRoute>} />

      {/* Tour Guide System — Fase 2: Program Live & Lokasi */}
      <Route path="/tour-leader/program" element={
        <ProtectedRoute allowedRoles={['super_admin', 'owner', 'operational', 'branch_manager']}>
          <LazyPage><TourLeaderProgram /></LazyPage>
        </ProtectedRoute>
      } />
      <Route path="/tour-leader/map" element={
        <ProtectedRoute allowedRoles={['super_admin', 'owner', 'operational', 'branch_manager']}>
          <LazyPage><TourLeaderMap /></LazyPage>
        </ProtectedRoute>
      } />
      <Route path="/jamaah/program-live"  element={<JamaahRoute><JamaahProgramLive /></JamaahRoute>} />
      <Route path="/jamaah/lokasi-guide"  element={<JamaahRoute><JamaahLokasiGuide /></JamaahRoute>} />

      {/* Tour Guide System — Fase 2: Perluasan Muthawif */}
      <Route path="/muthawif/broadcast" element={
        <ProtectedRoute allowedRoles={['super_admin', 'owner', 'operational']}>
          <LazyPage><MuthawifBroadcast /></LazyPage>
        </ProtectedRoute>
      } />
      <Route path="/muthawif/absensi-sesi" element={
        <ProtectedRoute allowedRoles={['super_admin', 'owner', 'operational']}>
          <LazyPage><MuthawifAbsensiSesi /></LazyPage>
        </ProtectedRoute>
      } />

      {/* Booking — guest mode: wizard publik, login diminta saat konfirmasi pembayaran */}
      <Route path="/booking/:packageId" element={<LazyPage><BookingPage /></LazyPage>} />
      <Route path="/booking/success/:bookingId" element={<ProtectedRoute><LazyPage><BookingSuccess /></LazyPage></ProtectedRoute>} />
      <Route path="/booking/recover" element={<LazyPage><BookingRecover /></LazyPage>} />
      <Route path="/my-bookings" element={<ProtectedRoute><LazyPage><MyBookings /></LazyPage></ProtectedRoute>} />
      <Route path="/my-bookings/:bookingId" element={<ProtectedRoute><LazyPage><BookingDetail /></LazyPage></ProtectedRoute>} />
      <Route path="/my-bookings/:bookingId/payment" element={<ProtectedRoute><LazyPage><PaymentUpload /></LazyPage></ProtectedRoute>} />
    </>
  );
}
