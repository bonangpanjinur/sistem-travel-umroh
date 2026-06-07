import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { ESSProtectedRoute } from "@/components/ess/ESSProtectedRoute";

const ESSLogin        = lazy(() => import("@/pages/ess/ESSLogin"));
const ESSDashboard    = lazy(() => import("@/pages/ess/ESSDashboard"));
const ESSPayrollSlips = lazy(() => import("@/pages/ess/ESSPayrollSlips"));
const ESSAbsensi      = lazy(() => import("@/pages/ess/ESSAbsensi"));
const ESSLeaveRequest = lazy(() => import("@/pages/ess/ESSLeaveRequest"));
const ESSCareerHistory= lazy(() => import("@/pages/ess/ESSCareerHistory"));
const ESSProfile      = lazy(() => import("@/pages/ess/ESSProfile"));

const LazyPage = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  }>
    {children}
  </Suspense>
);

const Guarded = ({ children }: { children: React.ReactNode }) => (
  <ESSProtectedRoute>
    <LazyPage>{children}</LazyPage>
  </ESSProtectedRoute>
);

export default function ESSRoutes() {
  return (
    <>
      <Route path="/ess/login"    element={<LazyPage><ESSLogin /></LazyPage>} />
      <Route path="/ess/dashboard"element={<Guarded><ESSDashboard /></Guarded>} />
      <Route path="/ess/payroll"  element={<Guarded><ESSPayrollSlips /></Guarded>} />
      <Route path="/ess/absensi"  element={<Guarded><ESSAbsensi /></Guarded>} />
      <Route path="/ess/cuti"     element={<Guarded><ESSLeaveRequest /></Guarded>} />
      <Route path="/ess/karir"    element={<Guarded><ESSCareerHistory /></Guarded>} />
      <Route path="/ess/profil"   element={<Guarded><ESSProfile /></Guarded>} />
    </>
  );
}
