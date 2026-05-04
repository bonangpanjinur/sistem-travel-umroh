import { ReactNode } from 'react';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SuperAdminGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component to guard pages that require Super Admin access
 * 
 * This component checks if the current user has the 'super_admin' role.
 * If not, it displays an access denied message instead of rendering the children.
 * 
 * Usage:
 * <SuperAdminGuard>
 *   <AdminRolePermissionsEnhanced />
 * </SuperAdminGuard>
 */
export function SuperAdminGuard({ children, fallback }: SuperAdminGuardProps) {
  const isSuperAdmin = useIsSuperAdmin();

  if (!isSuperAdmin) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Akses Ditolak</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Halaman ini hanya dapat diakses oleh Super Admin. Anda tidak memiliki izin untuk mengakses fitur ini.
            </p>
            <Button asChild className="w-full">
              <Link to="/admin">Kembali ke Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
