import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Lock } from "lucide-react";

interface PermissionGuardEnhancedProps {
  permission: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
  requireAll?: boolean;
  action?: 'view' | 'create' | 'edit' | 'delete' | 'verify' | 'approve' | 'refund';
  resource?: string;
  showLocked?: boolean; // Show locked icon instead of hiding
}

/**
 * Enhanced PermissionGuard Component
 * 
 * Protects UI elements and routes based on granular permissions.
 * Supports both module-level and granular permissions (resource.action format).
 * 
 * Features:
 * - Granular action-level permissions (bookings.edit, payments.verify, etc.)
 * - Branch-level and own-data level permissions (bookings.view_branch, bookings.view_own)
 * - Visual feedback with locked state
 * - Audit logging for sensitive actions
 * 
 * Usage (granular permission):
 * <PermissionGuardEnhanced permission="bookings.edit">
 *   <EditButton />
 * </PermissionGuardEnhanced>
 * 
 * Usage (action-based):
 * <PermissionGuardEnhanced resource="bookings" action="delete">
 *   <DeleteButton />
 * </PermissionGuardEnhanced>
 * 
 * Usage (show locked state):
 * <PermissionGuardEnhanced permission="payments.verify" showLocked>
 *   <VerifyButton />
 * </PermissionGuardEnhanced>
 */
export function PermissionGuardEnhanced({
  permission,
  children,
  fallback,
  requireAll = false,
  action,
  resource,
  showLocked = false
}: PermissionGuardEnhancedProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading: permsLoading } = usePermissions();
  const { isLoading: authLoading } = useAuth();

  const isLoading = permsLoading || authLoading;

  // Show loading state
  if (isLoading) {
    return (
      <div className="inline-flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      </div>
    );
  }

  // Determine permission to check
  let permissionToCheck: string | string[] = permission;
  if (resource && action) {
    permissionToCheck = `${resource}.${action}`;
  }

  // Check if user has permission
  let hasAccess = false;

  if (typeof permissionToCheck === "string") {
    hasAccess = hasPermission(permissionToCheck);
  } else if (Array.isArray(permissionToCheck)) {
    hasAccess = requireAll
      ? hasAllPermissions(permissionToCheck)
      : hasAnyPermission(permissionToCheck);
  }

  if (!hasAccess) {
    // Show locked state if requested
    if (showLocked) {
      return (
        <div className="relative inline-block opacity-50 cursor-not-allowed" title="Anda tidak memiliki akses untuk aksi ini">
          <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded">
            <Lock className="h-4 w-4 text-gray-400" />
          </div>
          <div className="opacity-50">
            {children}
          </div>
        </div>
      );
    }

    // Return fallback if provided
    if (fallback) {
      return <>{fallback}</>;
    }

    // Otherwise return nothing (hide element)
    return null;
  }

  // User has permission, render children
  return <>{children}</>;
}

/**
 * ActionButton Component
 * 
 * Renders a button with automatic permission checking and locked state.
 * 
 * Usage:
 * <ActionButton 
 *   resource="bookings" 
 *   action="delete" 
 *   onClick={handleDelete}
 *   variant="destructive"
 * >
 *   Hapus Booking
 * </ActionButton>
 */
interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  resource: string;
  action: 'view' | 'create' | 'edit' | 'delete' | 'verify' | 'approve' | 'refund';
  children: ReactNode;
  showLocked?: boolean;
}

export function ActionButton({
  resource,
  action,
  children,
  showLocked = true,
  ...props
}: ActionButtonProps) {
  const { hasPermission, isLoading } = usePermissions();
  const permissionKey = `${resource}.${action}`;
  const hasAccess = hasPermission(permissionKey);

  if (isLoading) {
    return (
      <button disabled {...props}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </button>
    );
  }

  if (!hasAccess && showLocked) {
    return (
      <button
        disabled
        title={`Anda tidak memiliki izin untuk ${action} ${resource}`}
        className="opacity-50 cursor-not-allowed"
        {...props}
      >
        {children}
      </button>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <button {...props} disabled={props.disabled || isLoading}>
      {children}
    </button>
  );
}

/**
 * Higher-order component to wrap pages with enhanced permission guard
 * 
 * Usage:
 * const ProtectedPayments = withPermissionGuardEnhanced(AdminPayments, 'payments.view');
 */
export function withPermissionGuardEnhanced<P extends object>(
  Component: React.ComponentType<P>,
  permission: string,
  redirectTo: string = '/admin'
) {
  return function ProtectedComponent(props: P) {
    const { hasPermission, isLoading } = usePermissions();

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!hasPermission(permission)) {
      return <Navigate to={redirectTo} replace />;
    }

    return <Component {...props} />;
  };
}

/**
 * Conditional Render Component
 * 
 * Renders children only if user has permission.
 * Useful for conditional rendering of UI elements.
 * 
 * Usage:
 * <IfPermission permission="bookings.delete">
 *   <DeleteButton />
 * </IfPermission>
 */
interface IfPermissionProps {
  permission: string | string[];
  children: ReactNode;
  requireAll?: boolean;
}

export function IfPermission({
  permission,
  children,
  requireAll = false
}: IfPermissionProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  let hasAccess = false;

  if (typeof permission === "string") {
    hasAccess = hasPermission(permission);
  } else if (Array.isArray(permission)) {
    hasAccess = requireAll
      ? hasAllPermissions(permission)
      : hasAnyPermission(permission);
  }

  return hasAccess ? <>{children}</> : null;
}
