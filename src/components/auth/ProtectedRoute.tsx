import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDynamicMenus } from '@/hooks/useDynamicMenus';
import { AppRole } from '@/types/database';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  allowedRoles?: AppRole[];
  permission?: string; // Specific permission key required to access this route
}

export default function ProtectedRoute({ 
  children, 
  requireAuth = true,
  allowedRoles,
  permission
}: ProtectedRouteProps) {
  const { user, isLoading: authLoading, isAdmin, roles } = useAuth();
  const location = useLocation();
  const { isPathAllowed, isLoading: menusLoading } = useDynamicMenus();
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [checkingPermission, setCheckingPermission] = useState(false);

  useEffect(() => {
    // Check granular path-based access using dynamic menus
    if (user && !menusLoading) {
      const pathAllowed = isPathAllowed(location.pathname);
      setPermissionGranted(pathAllowed);
    }
  }, [user, location.pathname, menusLoading, isPathAllowed]);

  const isLoading = authLoading || menusLoading || checkingPermission;

  // Show loading state while checking auth and permissions
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Memeriksa izin akses...</p>
        </div>
      </div>
    );
  }

  // If loading finished but no user, and it's required, redirect to login
  if (requireAuth && !user) {
    return <Navigate to={`/auth/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  // Check if user has allowed role (Legacy check)
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = roles.some(role => allowedRoles.includes(role));
    if (!hasAllowedRole) {
      return <Navigate to="/access-denied" replace />;
    }
  }

  // Check granular path-based permission (New granular check via isPathAllowed)
  if (permissionGranted === false) {
    return <Navigate to="/access-denied" replace />;
  }

  // Check specific permission (Legacy check)
  if (permission && permissionGranted === false) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
}
