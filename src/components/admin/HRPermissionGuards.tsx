import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface HRPermissionGuardProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component to guard HR module features based on granular permissions
 */
export function HRPermissionGuard({ 
  permission, 
  children, 
  fallback 
}: HRPermissionGuardProps) {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permission)) {
    return fallback || (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-yellow-800">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">Anda tidak memiliki izin untuk mengakses fitur ini.</p>
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
interface HRActionGuardProps {
  permission: string;
  children: ReactNode;
}

export function HRActionGuard({ permission, children }: HRActionGuardProps) {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permission)) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Hook to check multiple HR permissions
 */
export function useHRPermissions() {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  return {
    // Employees
    canViewEmployees: () => hasPermission('hr.employees.view'),
    canManageEmployees: () => hasPermission('hr.employees.manage'),
    
    // Attendance
    canViewAttendance: () => hasPermission('hr.attendance.view'),
    canManageAttendance: () => hasPermission('hr.attendance.manage'),
    
    // Payroll
    canViewPayroll: () => hasPermission('hr.payroll.view'),
    canManagePayroll: () => hasPermission('hr.payroll.manage'),
    
    // Departments
    canViewDepartments: () => hasPermission('hr.departments.view'),
    canManageDepartments: () => hasPermission('hr.departments.manage'),
    
    // Positions
    canViewPositions: () => hasPermission('hr.positions.view'),
    canManagePositions: () => hasPermission('hr.positions.manage'),
    
    // Schedules
    canViewSchedules: () => hasPermission('hr.schedules.view'),
    canManageSchedules: () => hasPermission('hr.schedules.manage'),
    
    // Devices
    canViewDevices: () => hasPermission('hr.devices.view'),
    canManageDevices: () => hasPermission('hr.devices.manage'),
    
    // Settings
    canViewHRSettings: () => hasPermission('hr.settings.view'),
    canManageHRSettings: () => hasPermission('hr.settings.manage'),
    
    // Check any HR permission
    hasAnyHRPermission: () => hasAnyPermission([
      'hr.employees.view', 'hr.employees.manage',
      'hr.attendance.view', 'hr.attendance.manage',
      'hr.payroll.view', 'hr.payroll.manage',
      'hr.departments.view', 'hr.departments.manage',
      'hr.positions.view', 'hr.positions.manage',
      'hr.schedules.view', 'hr.schedules.manage',
      'hr.devices.view', 'hr.devices.manage',
      'hr.settings.view', 'hr.settings.manage',
    ]),
  };
}
