import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface PermissionGuardProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * PermissionGuard Component
 * 
 * Protects routes based on user permissions from the database.
 * If user doesn't have the required permission, redirects to /admin or shows fallback.
 * 
 * Usage:
 * <PermissionGuard permission="payments">
 *   <AdminPayments />
 * </PermissionGuard>
 */
export function PermissionGuard({ 
  permission, 
  children, 
  fallback 
}: PermissionGuardProps) {
  const { hasPermission, isLoading: permsLoading } = usePermissions();
  const { isLoading: authLoading, roles } = useAuth();
  
  const isLoading = permsLoading || authLoading;

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Memverifikasi akses...</p>
        </div>
      </div>
    );
  }

  // Check if user has permission
  if (!hasPermission(permission)) {
    // Return fallback if provided
    if (fallback) {
      return <>{fallback}</>;
    }

    // Otherwise redirect to admin dashboard
    return <Navigate to="/admin" replace />;
  }

  // User has permission, render children
  return <>{children}</>;
}

/**
 * Higher-order component to wrap pages with permission guard
 * 
 * Usage:
 * const ProtectedPayments = withPermissionGuard(AdminPayments, 'payments');
 */
export function withPermissionGuard<P extends object>(
  Component: React.ComponentType<P>,
  permission: string
) {
  return function ProtectedComponent(props: P) {
    return (
      <PermissionGuard permission={permission}>
        <Component {...props} />
      </PermissionGuard>
    );
  };
}
