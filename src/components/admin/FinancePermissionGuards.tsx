import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface FinancePermissionGuardProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component to guard Finance module features based on granular permissions
 */
export function FinancePermissionGuard({ 
  permission, 
  children, 
  fallback 
}: FinancePermissionGuardProps) {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permission)) {
    return fallback || (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-yellow-800">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">Anda tidak memiliki izin untuk mengakses fitur keuangan ini.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}

/**
 * Component to conditionally render a button/action based on permission
 */
interface FinanceActionGuardProps {
  permission: string;
  children: ReactNode;
}

export function FinanceActionGuard({ permission, children }: FinanceActionGuardProps) {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permission)) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Hook to check multiple Finance permissions
 */
export function useFinancePermissions() {
  const { hasPermission, hasAnyPermission } = usePermissions();

  return {
    // Payment viewing
    canViewAllPayments: () => hasPermission('payments.view_all'),
    canViewBranchPayments: () => hasPermission('payments.view_branch'),
    canViewOwnPayments: () => hasPermission('payments.view_own'),
    
    // Payment actions
    canCreatePayments: () => hasPermission('payments.create'),
    canVerifyPayments: () => hasPermission('payments.verify'),
    canRefundPayments: () => hasPermission('payments.refund'),
    
    // Reports
    canViewFinanceReports: () => hasPermission('finance.reports'),
    
    // Booking viewing for finance
    canViewAllBookings: () => hasPermission('bookings.view_all'),
    
    // Customer viewing
    canViewCustomers: () => hasPermission('customers.view'),
    
    // Dashboard & Analytics
    canViewDashboard: () => hasPermission('dashboard.view'),
    canViewAnalytics: () => hasPermission('analytics.view'),
    canViewReports: () => hasPermission('reports.view'),
    
    // Check if user can view any payment data
    canViewAnyPayments: () => hasAnyPermission([
      'payments.view_all',
      'payments.view_branch',
      'payments.view_own'
    ]),
    
    // Check if user can manage payments
    canManagePayments: () => hasAnyPermission([
      'payments.create',
      'payments.verify',
      'payments.refund'
    ]),
  };
}

/**
 * Scope-based payment access helper
 */
export function usePaymentScope() {
  const { hasPermission } = usePermissions();

  return {
    scope: (() => {
      if (hasPermission('payments.view_all')) return 'all';
      if (hasPermission('payments.view_branch')) return 'branch';
      if (hasPermission('payments.view_own')) return 'own';
      return null;
    })(),
    
    isViewAll: () => hasPermission('payments.view_all'),
    isViewBranch: () => hasPermission('payments.view_branch'),
    isViewOwn: () => hasPermission('payments.view_own'),
  };
}
