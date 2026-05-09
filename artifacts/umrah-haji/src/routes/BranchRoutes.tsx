import { Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { LoadingState } from "@/components/shared/LoadingState";

const BranchLayout = lazy(() => import("@/pages/branch/BranchLayout"));
const BranchDashboard = lazy(() => import("@/pages/branch/BranchDashboard"));
const BranchLaporan = lazy(() => import("@/pages/branch/BranchLaporan"));
const BranchAgen = lazy(() => import("@/pages/branch/BranchAgen"));
const BranchBookings = lazy(() => import("@/pages/branch/BranchBookings"));
const BranchDiskon    = lazy(() => import("@/pages/branch/BranchDiskon"));
const BranchApprovals = lazy(() => import("@/pages/branch/BranchApprovals"));

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingState />}>{children}</Suspense>;
}

export default function BranchRoutes() {
  return (
    <Route
      path="/cabang"
      element={
        <Suspense fallback={<LoadingState />}>
          <BranchLayout />
        </Suspense>
      }
    >
      <Route index element={<LazyPage><BranchDashboard /></LazyPage>} />
      <Route path="laporan" element={<LazyPage><BranchLaporan /></LazyPage>} />
      <Route path="agen" element={<LazyPage><BranchAgen /></LazyPage>} />
      <Route path="bookings" element={<LazyPage><BranchBookings /></LazyPage>} />
      <Route path="diskon"    element={<LazyPage><BranchDiskon /></LazyPage>} />
      <Route path="approvals" element={<LazyPage><BranchApprovals /></LazyPage>} />
    </Route>
  );
}
