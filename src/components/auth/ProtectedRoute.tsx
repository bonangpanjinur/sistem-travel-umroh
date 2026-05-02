import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDynamicMenus } from '@/hooks/useDynamicMenus';
import { AppRole } from '@/types/database';
import { Loader2 } from 'lucide-react';

// Verbose route logs only when `?debug=auth` is present in the URL.
const DEBUG_AUTH =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('debug') === 'auth';
const dlog = (...a: unknown[]) => {
  if (DEBUG_AUTH) console.log(...a);
};

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
  const { isPathAllowed, isLoading, effectiveKeys, allowedSet } = useDynamicMenus();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoading) {
      const isAllowed = isPathAllowed(location.pathname);
      dlog(`DEBUG [DynamicMenuGate] - Permission check:`, {
        pathname: location.pathname,
        isAllowed,
        effectivePermissions: Array.from(effectiveKeys),
        allowedPermissionSet: Array.from(allowedSet),
        timestamp: new Date().toISOString()
      });
      setAllowed(isAllowed);
    } else {
      dlog(`DEBUG [DynamicMenuGate] - Still loading dynamic menus for path: ${location.pathname}`);
    }
  }, [isLoading, isPathAllowed, location.pathname, effectiveKeys, allowedSet]);

  if (isLoading || allowed === null) {
    dlog("DEBUG [DynamicMenuGate] - Showing loading screen (isLoading or allowed=null)");
    return <LoadingScreen />;
  }
  if (allowed === false) {
    // If the user has no effective permissions at all, the RBAC tables are likely
    // unconfigured. Warn loudly (this is rare and important) and let the redirect
    // happen so super_admin can fix it via /admin/rbac-tools.
    if (effectiveKeys.length === 0) {
      console.warn(
        '[RBAC] User has zero effective permissions — role_permissions table may be empty. ' +
          'A super_admin should open /admin/rbac-tools and click "Resync All".'
      );
    } else {
      dlog('DEBUG [DynamicMenuGate] - Access denied by dynamic menu check', {
        pathname: location.pathname,
      });
    }
    return <Navigate to="/access-denied" replace />;
  }
  dlog("DEBUG [DynamicMenuGate] - Granting access to path:", location.pathname);
  return <>{children}</>;
}

export default function ProtectedRoute({
  children,
  requireAuth = true,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, isLoading: authLoading, roles, isStaff, isSuperAdmin, profile } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!authLoading && user) {
      dlog("DEBUG [ProtectedRoute] - Auth State:", {
        userId: user.id,
        userEmail: user.email,
        roles: roles,
        profileRole: (profile as any)?.role,
        profileId: (profile as any)?.id,
        isStaff: isStaff(),
        isSuperAdmin: isSuperAdmin(),
        pathname: location.pathname,
        timestamp: new Date().toISOString()
      });

      dlog("DEBUG [ProtectedRoute] - Session Info:", {
        hasSession: !!user,
        authLoading: authLoading,
        profileExists: !!profile,
        rolesCount: roles.length
      });
    } else if (authLoading) {
      dlog("DEBUG [ProtectedRoute] - Still loading auth...");
    } else {
      dlog("DEBUG [ProtectedRoute] - No user authenticated");
    }
  }, [authLoading, user, roles, profile, location.pathname]);

  if (authLoading) {
    dlog("DEBUG [ProtectedRoute] - Showing loading screen (authLoading=true)");
    return <LoadingScreen />;
  }

  if (requireAuth && !user) {
    dlog("DEBUG [ProtectedRoute] - Redirecting to login (requireAuth=true, no user)", {
      pathname: location.pathname,
      search: location.search
    });
    return <Navigate to={`/auth/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  // Legacy role-based check
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = roles.some(role => allowedRoles.includes(role));
    dlog("DEBUG [ProtectedRoute] - Legacy role check:", {
      allowedRoles: allowedRoles,
      userRoles: roles,
      hasAllowedRole: hasAllowedRole
    });
    if (!hasAllowedRole) {
      dlog("DEBUG [ProtectedRoute] - Access denied: user role not in allowedRoles", {
        allowedRoles,
        userRoles: roles
      });
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

  dlog("DEBUG [ProtectedRoute] - Permission check decision:", {
    isSuper,
    isStaffPath,
    isStaffUser: isStaff(),
    shouldCheckDynamicMenus,
    pathname: location.pathname
  });

  if (!shouldCheckDynamicMenus) {
    dlog("DEBUG [ProtectedRoute] - Granting access (no dynamic menu check needed)");
    return <>{children}</>;
  }

  // Only this branch subscribes to useDynamicMenus
  return <DynamicMenuGate>{children}</DynamicMenuGate>;
}
