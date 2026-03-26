import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { AppRole } from '@/types/database';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
  permission?: string;
  requireAuth?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  allowedRoles,
  permission,
  requireAuth = true 
}: ProtectedRouteProps) {
  const { user, roles, isLoading: authLoading, isAdmin } = useAuth();
  const { hasPermission, isLoading: permsLoading } = usePermissions();
  const location = useLocation();

  const isLoading = authLoading || permsLoading;

  // Show loading state while checking auth and permissions
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  // Check if authentication is required
  if (requireAuth && !user) {
    return <Navigate to={`/auth/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  // Check permission-based access if specified
  if (permission && !hasPermission(permission)) {
    // Redirect unauthorized users
    if (isAdmin()) {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // Check role-based access (fallback if no permission specified)
  if (allowedRoles && allowedRoles.length > 0 && !permission) {
    const hasAllowedRole = allowedRoles.some(role => roles.includes(role));
    
    // Special case: check if user is admin (super_admin, owner, branch_manager)
    const adminRoles: AppRole[] = ['super_admin', 'owner', 'branch_manager'];
    const needsAdminRole = allowedRoles.some(role => adminRoles.includes(role));
    
    if (needsAdminRole && isAdmin()) {
      return <>{children}</>;
    }
    
    if (!hasAllowedRole) {
      // Redirect unauthorized users
      if (isAdmin()) {
        return <Navigate to="/admin" replace />;
      }
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
