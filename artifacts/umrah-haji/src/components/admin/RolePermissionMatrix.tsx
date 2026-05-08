import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { AppRole } from '@/types/database';
import { cn } from '@/lib/utils';

interface Permission {
  key: string;
  label: string;
  category: string;
}

interface RolePermissionMatrixProps {
  permissions: Permission[];
  rolePermissions: Record<AppRole, string[]>;
  className?: string;
}

const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  owner: 'Owner',
  branch_manager: 'Branch Manager',
  finance: 'Finance',
  operational: 'Operational',
  sales: 'Sales',
  marketing: 'Marketing',
  equipment: 'Equipment',
  agent: 'Agent',
  sub_agent: 'Sub Agent',
  customer: 'Customer',
  jamaah: 'Jamaah',
};

const ROLE_COLORS: Record<AppRole, string> = {
  super_admin: 'bg-red-100 text-red-800',
  owner: 'bg-purple-100 text-purple-800',
  branch_manager: 'bg-blue-100 text-blue-800',
  finance: 'bg-green-100 text-green-800',
  operational: 'bg-amber-100 text-amber-800',
  sales: 'bg-cyan-100 text-cyan-800',
  marketing: 'bg-pink-100 text-pink-800',
  equipment: 'bg-gray-100 text-gray-800',
  agent: 'bg-indigo-100 text-indigo-800',
  sub_agent: 'bg-violet-100 text-violet-800',
  customer: 'bg-slate-100 text-slate-800',
  jamaah: 'bg-teal-100 text-teal-800',
};

export function RolePermissionMatrix({
  permissions,
  rolePermissions,
  className,
}: RolePermissionMatrixProps) {
  const roles: AppRole[] = [
    'super_admin',
    'owner',
    'branch_manager',
    'finance',
    'operational',
    'sales',
    'marketing',
    'equipment',
    'agent',
    'sub_agent',
    'customer',
  ];

  const categories = useMemo(() => {
    const cats = new Set(permissions.map(p => p.category));
    return Array.from(cats).sort();
  }, [permissions]);

  const getPermissionStatus = (role: AppRole, permissionKey: string) => {
    const hasPermission = rolePermissions[role]?.includes(permissionKey);
    return hasPermission ? 'granted' : 'denied';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Matriks Izin per Role</CardTitle>
        <CardDescription>
          Lihat perbandingan izin yang dimiliki oleh setiap role dalam sistem
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {categories.map(category => {
            const categoryPermissions = permissions.filter(p => p.category === category);
            return (
              <div key={category} className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">{category}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-semibold text-muted-foreground sticky left-0 bg-muted/50 z-10 w-48">
                          Izin
                        </th>
                        {roles.map(role => (
                          <th
                            key={role}
                            className="text-center py-2 px-2 font-semibold text-muted-foreground min-w-[100px]"
                          >
                            <Badge className={ROLE_COLORS[role]} variant="secondary">
                              {ROLE_LABELS[role]}
                            </Badge>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {categoryPermissions.map(permission => (
                        <tr key={permission.key} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-2 px-3 font-medium text-foreground sticky left-0 bg-background z-10 w-48">
                            {permission.label}
                          </td>
                          {roles.map(role => {
                            const status = getPermissionStatus(role, permission.key);
                            const isGranted = status === 'granted';
                            return (
                              <td key={`${role}-${permission.key}`} className="text-center py-2 px-2">
                                {isGranted ? (
                                  <div className="flex justify-center">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                  </div>
                                ) : (
                                  <div className="flex justify-center">
                                    <XCircle className="h-4 w-4 text-red-400" />
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-6 border-t space-y-3">
          <h4 className="text-sm font-semibold">Legenda</h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-muted-foreground">Izin Diberikan</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-400" />
              <span className="text-muted-foreground">Izin Ditolak</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
