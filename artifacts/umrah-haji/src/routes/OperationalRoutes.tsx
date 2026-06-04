import { Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { LoadingState } from "@/components/shared/LoadingState";
import { AppRole } from "@/types/database";

const OperationalLayout = lazy(() => import("@/pages/operational/OperationalLayout"));
const OperationalDashboard = lazy(() => import("@/pages/operational/OperationalDashboard"));
const ManifestPage = lazy(() => import("@/pages/operational/ManifestPage"));
const CheckinPage = lazy(() => import("@/pages/operational/CheckinPage"));
const LuggagePage = lazy(() => import("@/pages/operational/LuggagePage"));
const RoomingListPage = lazy(() => import("@/pages/operational/RoomingListPageImproved"));
const QRCodePage = lazy(() => import("@/pages/operational/QRCodePage"));
const EquipmentPage = lazy(() => import("@/pages/operational/EquipmentPage"));
const BusManagementPage = lazy(() => import("@/pages/operational/BusManagementPage"));
const DepartureReadinessPage = lazy(() => import("@/pages/operational/DepartureReadinessPage"));
const TripTimelinePage = lazy(() => import("@/pages/operational/TripTimelinePage"));
const OperationalDocumentPage = lazy(() => import("@/pages/operational/OperationalDocumentPage"));
const OfficeAssets = lazy(() => import("@/pages/operational/OfficeAssets"));
const EmployeeAttendance = lazy(() => import("@/pages/hr/EmployeeAttendance"));

/**
 * Role yang boleh mengakses modul operasional lapangan.
 * Equipment hanya bisa melihat manifest & peralatan, namun tetap butuh
 * akses layout OperationalLayout — pembatasan per halaman dilakukan di
 * level komponen jika diperlukan.
 */
const OPERATIONAL_ROLES: AppRole[] = [
  'super_admin', 'owner', 'branch_manager', 'operational', 'equipment',
];

/**
 * Role yang boleh melihat data absensi karyawan (HR).
 * Finance ditambahkan karena absensi terkait penggajian.
 * Equipment dan sales tidak perlu akses ini.
 */
const HR_ROLES: AppRole[] = [
  'super_admin', 'owner', 'branch_manager', 'operational', 'finance',
];

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingState />}>{children}</Suspense>;
}

export default function OperationalRoutes() {
  return (
    <>
      <Route
        path="/operational"
        element={
          <ProtectedRoute allowedRoles={OPERATIONAL_ROLES}>
            <LazyPage><OperationalLayout /></LazyPage>
          </ProtectedRoute>
        }
      >
        <Route index element={<LazyPage><OperationalDashboard /></LazyPage>} />
        <Route path="manifest" element={<LazyPage><ManifestPage /></LazyPage>} />
        <Route path="checkin" element={<LazyPage><CheckinPage /></LazyPage>} />
        <Route path="luggage" element={<LazyPage><LuggagePage /></LazyPage>} />
        <Route path="rooming" element={<LazyPage><RoomingListPage /></LazyPage>} />
        <Route path="qrcode" element={<LazyPage><QRCodePage /></LazyPage>} />
        <Route path="equipment" element={<LazyPage><EquipmentPage /></LazyPage>} />
        <Route path="bus" element={<LazyPage><BusManagementPage /></LazyPage>} />
        <Route path="readiness" element={<LazyPage><DepartureReadinessPage /></LazyPage>} />
        <Route path="timeline" element={<LazyPage><TripTimelinePage /></LazyPage>} />
        <Route path="documents" element={<LazyPage><OperationalDocumentPage /></LazyPage>} />
        <Route path="assets" element={<LazyPage><OfficeAssets /></LazyPage>} />
      </Route>

      {/* HR — Absensi & Kehadiran Karyawan */}
      <Route
        path="/hr"
        element={
          <ProtectedRoute allowedRoles={HR_ROLES}>
            <LazyPage><EmployeeAttendance /></LazyPage>
          </ProtectedRoute>
        }
      />

      {/* /absensi — alias /hr, role sama: hanya staf HR yang relevan */}
      <Route
        path="/absensi"
        element={
          <ProtectedRoute allowedRoles={HR_ROLES}>
            <LazyPage><EmployeeAttendance /></LazyPage>
          </ProtectedRoute>
        }
      />
    </>
  );
}
