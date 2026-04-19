import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDynamicMenus } from '@/hooks/useDynamicMenus';
import { AppRole } from '@/types/database';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  allowedRoles?: AppRole[];
  permission?: string;
}

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Memeriksa izin akses...</p>
    </div>
  </div>
);

/**
 * Sub-component that ONLY mounts when dynamic menu permission check is needed.
 * This avoids subscribing to useDynamicMenus query for super admins / non-staff routes,
 * which prevents extra re-renders on the Admin Layout.
 */
function DynamicMenuGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isPathAllowed, isLoading } = useDynamicMenus();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoading) {
      setAllowed(isPathAllowed(location.pathname));
    }
  }, [isLoading, isPathAllowed, location.pathname]);

  if (isLoading || allowed === null) return <LoadingScreen />;
  if (allowed === false) return <Navigate to="/access-denied" replace />;
  return <>{children}</>;
}

export default function ProtectedRoute({
  children,
  requireAuth = true,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, isLoading: authLoading, roles, isStaff, isSuperAdmin } = useAuth();
  const location = useLocation();

  if (authLoading) return <LoadingScreen />;

  if (requireAuth && !user) {
    return <Navigate to={`/auth/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  // Legacy role-based check
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = roles.some(role => allowedRoles.includes(role));
    if (!hasAllowedRole) {
      return <Navigate to="/access-denied" replace />;
    }
  }

  // Super admin bypasses dynamic permission checks (no useDynamicMenus subscription)
  const isSuper = isSuperAdmin();
  const isStaffPath =
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/operational') ||
    location.pathname.startsWith('/hr');
  const shouldCheckDynamicMenus = !!user && isStaffPath && isStaff() && !isSuper;

  if (!shouldCheckDynamicMenus) {
    return <>{children}</>;
  }

  // Only this branch subscribes to useDynamicMenus
  return <DynamicMenuGate>{children}</DynamicMenuGate>;
}
