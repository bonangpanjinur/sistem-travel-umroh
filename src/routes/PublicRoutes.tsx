import { Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { LoadingState } from "@/components/shared/LoadingState";

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

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingState />}>{children}</Suspense>;
}

export default function PublicRoutes() {
  return (
    <>
      <Route path="/" element={<LazyPage><Index /></LazyPage>} />
      <Route path="/login" element={<Navigate to="/auth/login" replace />} />
      <Route path="/register" element={<Navigate to="/auth/register" replace />} />
      <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
      <Route path="/auth/login" element={<LazyPage><Login /></LazyPage>} />
      <Route path="/auth/register" element={<LazyPage><Register /></LazyPage>} />
      <Route path="/auth/forgot-password" element={<LazyPage><ForgotPassword /></LazyPage>} />
      <Route path="/auth/reset-password" element={<LazyPage><ResetPassword /></LazyPage>} />
      <Route path="/packages" element={<LazyPage><PackageList /></LazyPage>} />
      <Route path="/packages/:id" element={<LazyPage><PackageDetail /></LazyPage>} />
      <Route path="/about" element={<LazyPage><AboutPage /></LazyPage>} />
      <Route path="/contact" element={<LazyPage><ContactPage /></LazyPage>} />
      <Route path="/savings" element={<LazyPage><SavingsPackages /></LazyPage>} />
      <Route path="/savings/register/:packageId" element={<LazyPage><SavingsRegister /></LazyPage>} />
      <Route path="/departures" element={<LazyPage><DeparturesPage /></LazyPage>} />
      <Route path="/faq" element={<LazyPage><StaticPage /></LazyPage>} />
      <Route path="/terms" element={<LazyPage><StaticPage /></LazyPage>} />
      <Route path="/privacy" element={<LazyPage><StaticPage /></LazyPage>} />
      <Route path="/:slug" element={<LazyPage><StaticPage /></LazyPage>} />
    </>
  );
}
