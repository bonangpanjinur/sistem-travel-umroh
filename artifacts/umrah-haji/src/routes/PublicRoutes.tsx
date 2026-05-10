import { Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { LoadingState } from "@/components/shared/LoadingState";

const DashboardRedirect = lazy(() => import("@/pages/admin/DashboardRedirect"));

const Index = lazy(() => import("@/pages/Index"));
const Login = lazy(() => import("@/pages/auth/Login"));
const Register = lazy(() => import("@/pages/auth/Register"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/auth/ResetPassword"));
const PackageList = lazy(() => import("@/pages/packages/PackageList"));
const PackageDetail = lazy(() => import("@/pages/packages/PackageDetail"));
const AboutPage = lazy(() => import("@/pages/public/AboutPage"));
const ContactPage = lazy(() => import("@/pages/public/ContactPage"));
const DeparturesPage = lazy(() => import("@/pages/public/DeparturesPage"));
const StaticPage = lazy(() => import("@/pages/public/StaticPage"));
const SavingsPackages = lazy(() => import("@/pages/savings/SavingsPackages"));
const SavingsRegister = lazy(() => import("@/pages/savings/SavingsRegister"));
const SavingsSuccess = lazy(() => import("@/pages/savings/SavingsSuccess"));
const SavingsDashboard = lazy(() => import("@/pages/savings/SavingsDashboard"));
const BranchWebsite = lazy(() => import("@/pages/public/BranchWebsite"));
const AgentWebsite = lazy(() => import("@/pages/public/AgentWebsite"));
const LandingPage = lazy(() => import("@/pages/public/LandingPage"));
const AccessDenied = lazy(() => import("@/pages/AccessDenied"));
const TeamPage = lazy(() => import("@/pages/public/TeamPage"));
const BookingStatusPage = lazy(() => import("@/pages/public/BookingStatusPage"));
const KalkulatorBiaya = lazy(() => import("@/pages/public/KalkulatorBiaya"));
const PackageCompare = lazy(() => import("@/pages/packages/PackageCompare"));
const KalkulatorCicilan = lazy(() => import("@/pages/customer/KalkulatorCicilan"));
const PublicBlog = lazy(() => import("@/pages/public/PublicBlog"));
const PublicBlogDetail = lazy(() => import("@/pages/public/PublicBlogDetail"));
const Testimonials = lazy(() => import("@/pages/public/Testimonials"));
const FiturPortalPage = lazy(() => import("@/pages/public/FiturPortalPage"));
const KursPage = lazy(() => import("@/pages/public/KursPage"));
const JamaahInfoPage = lazy(() => import("@/pages/public/JamaahInfoPage"));
const PantauJamaahPage = lazy(() => import("@/pages/public/PantauJamaahPage"));
const JadwalSholat = lazy(() => import("@/pages/public/JadwalSholat"));
const AlQuran = lazy(() => import("@/pages/public/AlQuran"));
const ArahKiblat = lazy(() => import("@/pages/public/ArahKiblat"));
const CuacaMekkah = lazy(() => import("@/pages/public/CuacaMekkah"));
const TrackerIbadah = lazy(() => import("@/pages/public/TrackerIbadah"));
const KalkulatorIslami = lazy(() => import("@/pages/public/KalkulatorIslami"));
const TasbihDigital = lazy(() => import("@/pages/public/TasbihDigital"));
const TokoOnline = lazy(() => import("@/pages/public/TokoOnline"));

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingState />}>{children}</Suspense>;
}

export default function PublicRoutes() {
  return (
    <>
      <Route path="/" element={<LazyPage><Index /></LazyPage>} />
      <Route path="/login" element={<Navigate to="/auth/login" replace />} />
      <Route path="/register" element={<Navigate to="/auth/register" replace />} />
      <Route path="/dashboard" element={<LazyPage><DashboardRedirect /></LazyPage>} />
      <Route path="/auth/login" element={<LazyPage><Login /></LazyPage>} />
      <Route path="/auth/register" element={<LazyPage><Register /></LazyPage>} />
      <Route path="/auth/forgot-password" element={<LazyPage><ForgotPassword /></LazyPage>} />
      <Route path="/auth/reset-password" element={<LazyPage><ResetPassword /></LazyPage>} />
      <Route path="/packages" element={<LazyPage><PackageList /></LazyPage>} />
      <Route path="/packages/:idSlug" element={<LazyPage><PackageDetail /></LazyPage>} />
      <Route path="/about" element={<LazyPage><AboutPage /></LazyPage>} />
      <Route path="/contact" element={<LazyPage><ContactPage /></LazyPage>} />
      <Route path="/savings" element={<LazyPage><SavingsPackages /></LazyPage>} />
      <Route path="/savings/register/:packageId" element={<LazyPage><SavingsRegister /></LazyPage>} />
      <Route path="/savings/success/:planId" element={<LazyPage><SavingsSuccess /></LazyPage>} />
      <Route path="/savings/dashboard" element={<LazyPage><SavingsDashboard /></LazyPage>} />
      <Route path="/departures" element={<LazyPage><DeparturesPage /></LazyPage>} />
      <Route path="/faq" element={<LazyPage><StaticPage /></LazyPage>} />
      <Route path="/terms" element={<LazyPage><StaticPage /></LazyPage>} />
      <Route path="/privacy" element={<LazyPage><StaticPage /></LazyPage>} />
      {/* Multi-tenant: Branch & Agent websites */}
      <Route path="/b/:branchSlug" element={<LazyPage><BranchWebsite /></LazyPage>} />
      <Route path="/a/:agentSlug" element={<LazyPage><AgentWebsite /></LazyPage>} />
      <Route path="/lp/:slug" element={<LazyPage><LandingPage /></LazyPage>} />
      <Route path="/team" element={<LazyPage><TeamPage /></LazyPage>} />
      <Route path="/cek-booking" element={<LazyPage><BookingStatusPage /></LazyPage>} />
      <Route path="/kalkulator" element={<LazyPage><KalkulatorBiaya /></LazyPage>} />
      <Route path="/kalkulator-cicilan" element={<LazyPage><KalkulatorCicilan /></LazyPage>} />
      <Route path="/packages/compare" element={<LazyPage><PackageCompare /></LazyPage>} />
      <Route path="/blog" element={<LazyPage><PublicBlog /></LazyPage>} />
      <Route path="/blog/:slug" element={<LazyPage><PublicBlogDetail /></LazyPage>} />
      <Route path="/testimonials" element={<LazyPage><Testimonials /></LazyPage>} />
      <Route path="/fitur" element={<LazyPage><FiturPortalPage /></LazyPage>} />
      <Route path="/kurs" element={<LazyPage><KursPage /></LazyPage>} />
      <Route path="/jamaah-info" element={<LazyPage><JamaahInfoPage /></LazyPage>} />
      <Route path="/pantau/:token" element={<LazyPage><PantauJamaahPage /></LazyPage>} />
      <Route path="/sholat" element={<LazyPage><JadwalSholat /></LazyPage>} />
      <Route path="/alquran" element={<LazyPage><AlQuran /></LazyPage>} />
      <Route path="/kiblat" element={<LazyPage><ArahKiblat /></LazyPage>} />
      <Route path="/cuaca" element={<LazyPage><CuacaMekkah /></LazyPage>} />
      <Route path="/tracker-ibadah" element={<LazyPage><TrackerIbadah /></LazyPage>} />
      <Route path="/kalkulator-islami" element={<LazyPage><KalkulatorIslami /></LazyPage>} />
      <Route path="/tasbih" element={<LazyPage><TasbihDigital /></LazyPage>} />
      <Route path="/toko" element={<Navigate to="/store" replace />} />
      <Route path="/toko/*" element={<Navigate to="/store" replace />} />
      <Route path="/access-denied" element={<LazyPage><AccessDenied /></LazyPage>} />
      <Route path="/:slug" element={<LazyPage><StaticPage /></LazyPage>} />
    </>
  );
}
