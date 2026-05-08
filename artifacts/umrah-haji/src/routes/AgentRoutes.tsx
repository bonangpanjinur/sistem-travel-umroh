import { Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { LoadingState } from "@/components/shared/LoadingState";
import { AppRole } from "@/types/database";

const AgentLayout = lazy(() => import("@/pages/agent/AgentLayoutEnhanced"));
const AgentDashboard = lazy(() => import("@/pages/agent/AgentDashboard"));
const AgentRegister = lazy(() => import("@/pages/agent/AgentRegister"));
const AgentRegisterGroup = lazy(() => import("@/pages/agent/AgentRegisterGroup"));
const AgentJamaah = lazy(() => import("@/pages/agent/AgentJamaahEnhanced"));
const AgentCommissions = lazy(() => import("@/pages/agent/AgentCommissions"));
const AgentPackages = lazy(() => import("@/pages/agent/AgentPackages"));
const AgentWallet = lazy(() => import("@/pages/agent/AgentWallet"));
const AgentWebsiteSettings = lazy(() => import("@/pages/agent/AgentWebsiteSettings"));
const AgentDigitalKit = lazy(() => import("@/pages/agent/AgentDigitalKit"));
const AgentSettings = lazy(() => import("@/pages/agent/AgentSettings"));
const AgentNetwork = lazy(() => import("@/pages/agent/AgentNetwork"));
const AgentMembership = lazy(() => import("@/pages/agent/AgentMembership"));
const AgentMyReferrals = lazy(() => import("@/pages/agent/AgentMyReferrals"));

/**
 * Role yang boleh mengakses portal agen.
 * - super_admin: untuk keperluan pengujian dan dukungan teknis.
 * - agent & sub_agent: mitra eksternal dengan portal sendiri.
 * - Staf internal (sales, owner, dll) tidak menggunakan portal ini;
 *   mereka mengelola agen via /admin/agents.
 */
const AGENT_PORTAL_ROLES: AppRole[] = ['super_admin', 'agent', 'sub_agent'];

/**
 * Role yang boleh melihat komisi dan dompet agen.
 * sub_agent tidak memiliki akses ke komisi langsung.
 */
const AGENT_FINANCE_ROLES: AppRole[] = ['super_admin', 'agent'];

/**
 * Role yang boleh mengelola jaringan sub-agen dan website agen.
 * sub_agent tidak boleh merekrut sub-agen lagi atau ubah website.
 */
const AGENT_MANAGEMENT_ROLES: AppRole[] = ['super_admin', 'agent'];

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingState />}>{children}</Suspense>;
}

function AgentOnlyPage({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={AGENT_FINANCE_ROLES}>
      <LazyPage>{children}</LazyPage>
    </ProtectedRoute>
  );
}

function AgentManagePage({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={AGENT_MANAGEMENT_ROLES}>
      <LazyPage>{children}</LazyPage>
    </ProtectedRoute>
  );
}

export default function AgentRoutes() {
  return (
    <Route
      path="/agent"
      element={
        <ProtectedRoute allowedRoles={AGENT_PORTAL_ROLES}>
          <LazyPage><AgentLayout /></LazyPage>
        </ProtectedRoute>
      }
    >
      {/* Halaman umum — agent & sub_agent */}
      <Route index element={<LazyPage><AgentDashboard /></LazyPage>} />
      <Route path="register" element={<LazyPage><AgentRegister /></LazyPage>} />
      <Route path="register-group" element={<LazyPage><AgentRegisterGroup /></LazyPage>} />
      <Route path="jamaah" element={<LazyPage><AgentJamaah /></LazyPage>} />
      <Route path="packages" element={<LazyPage><AgentPackages /></LazyPage>} />
      <Route path="digital-kit" element={<LazyPage><AgentDigitalKit /></LazyPage>} />
      <Route path="settings" element={<LazyPage><AgentSettings /></LazyPage>} />
      <Route path="membership" element={<LazyPage><AgentMembership /></LazyPage>} />
      <Route path="referrals" element={<LazyPage><AgentMyReferrals /></LazyPage>} />

      {/* Keuangan — hanya agent utama (bukan sub_agent) */}
      <Route path="commissions" element={<AgentOnlyPage><AgentCommissions /></AgentOnlyPage>} />
      <Route path="wallet" element={<AgentOnlyPage><AgentWallet /></AgentOnlyPage>} />

      {/* Manajemen — hanya agent utama */}
      <Route path="website" element={<AgentManagePage><AgentWebsiteSettings /></AgentManagePage>} />
      <Route path="network" element={<AgentManagePage><AgentNetwork /></AgentManagePage>} />
    </Route>
  );
}
