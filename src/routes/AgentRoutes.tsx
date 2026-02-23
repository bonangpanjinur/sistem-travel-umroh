import { Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { LoadingState } from "@/components/shared/LoadingState";

const AgentLayout = lazy(() => import("@/pages/agent/AgentLayout"));
const AgentDashboard = lazy(() => import("@/pages/agent/AgentDashboard"));
const AgentRegister = lazy(() => import("@/pages/agent/AgentRegister"));
const AgentRegisterGroup = lazy(() => import("@/pages/agent/AgentRegisterGroup"));
const AgentJamaah = lazy(() => import("@/pages/agent/AgentJamaah"));
const AgentCommissions = lazy(() => import("@/pages/agent/AgentCommissions"));
const AgentPackages = lazy(() => import("@/pages/agent/AgentPackages"));
const AgentWallet = lazy(() => import("@/pages/agent/AgentWallet"));
const AgentWebsiteSettings = lazy(() => import("@/pages/agent/AgentWebsiteSettings"));
const AgentDigitalKit = lazy(() => import("@/pages/agent/AgentDigitalKit"));

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingState />}>{children}</Suspense>;
}

export default function AgentRoutes() {
  return (
    <Route
      path="/agent"
      element={
        <ProtectedRoute allowedRoles={['super_admin', 'owner', 'agent']}>
          <LazyPage><AgentLayout /></LazyPage>
        </ProtectedRoute>
      }
    >
      <Route index element={<LazyPage><AgentDashboard /></LazyPage>} />
      <Route path="register" element={<LazyPage><AgentRegister /></LazyPage>} />
      <Route path="register-group" element={<LazyPage><AgentRegisterGroup /></LazyPage>} />
      <Route path="jamaah" element={<LazyPage><AgentJamaah /></LazyPage>} />
      <Route path="commissions" element={<LazyPage><AgentCommissions /></LazyPage>} />
      <Route path="wallet" element={<LazyPage><AgentWallet /></LazyPage>} />
      <Route path="packages" element={<LazyPage><AgentPackages /></LazyPage>} />
      <Route path="website" element={<LazyPage><AgentWebsiteSettings /></LazyPage>} />
      <Route path="digital-kit" element={<LazyPage><AgentDigitalKit /></LazyPage>} />
    </Route>
  );
}
