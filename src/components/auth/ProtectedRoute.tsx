import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [checkingPermission, setCheckingPermission] = useState(false);

  useEffect(() => {
    async function checkPermission() {
      if (user && permission) {
        setCheckingPermission(true);
        try {
          const { data, error } = await supabase.rpc('get_user_effective_permission', {
            p_user_id: user.id,
            p_permission_key: permission
          });
          
          if (error) {
            console.error('Permission check error:', error);
            setPermissionGranted(false);
          } else {
            setPermissionGranted(!!data);
          }
        } catch (err) {
          console.error('Unexpected error during permission check:', err);
          setPermissionGranted(false);
        } finally {
          setCheckingPermission(false);
        }
      } else {
        setPermissionGranted(true);
      }
    }

    if (!authLoading && user) {
      checkPermission();
    }
  }, [user, permission, authLoading]);

  const isLoading = authLoading || checkingPermission;

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

  // If it's an admin route (starts with /admin) and user is not admin, redirect to home
  if (location.pathname.startsWith('/admin') && !isAdmin()) {
    return <Navigate to="/" replace />;
  }

  // Check if user has allowed role (Legacy check)
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = roles.some(role => allowedRoles.includes(role));
    if (!hasAllowedRole) {
      return <Navigate to="/access-denied" replace />;
    }
  }

  // Check specific permission (New granular check)
  if (permission && permissionGranted === false) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
}
