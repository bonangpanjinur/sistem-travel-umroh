import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface PermissionGuardProps {
  permission: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
  requireAll?: boolean;
}

/**
 * PermissionGuard Component
 * 
 * Protects routes based on user permissions from the database.
 * Supports both module-level and granular permissions.
 * If user doesn't have the required permission, redirects to /admin or shows fallback.
 * 
 * Usage (single permission):
 * <PermissionGuard permission="bookings.view">
 *   <BookingsList />
 * </PermissionGuard>
 * 
 * Usage (multiple permissions - any):
 * <PermissionGuard permission={["bookings.edit", "bookings.delete"]}>
 *   <BookingActions />
 * </PermissionGuard>
 * 
 * Usage (multiple permissions - all):
 * <PermissionGuard permission={["bookings.view", "bookings.edit"]} requireAll={true}>
 *   <BookingManagement />
 * </PermissionGuard>
 */
export function PermissionGuard({ 
  permission, 
  children, 
  fallback,
  requireAll = false
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading: permsLoading } = usePermissions();
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
  let hasAccess = false;
  
  if (typeof permission === "string") {
    hasAccess = hasPermission(permission);
  } else if (Array.isArray(permission)) {
    hasAccess = requireAll
      ? hasAllPermissions(permission)
      : hasAnyPermission(permission);
  }

  if (!hasAccess) {
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
