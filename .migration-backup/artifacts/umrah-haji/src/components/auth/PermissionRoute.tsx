/**
 * PermissionRoute — universal guard yang memeriksa effective permission user.
 * Super admin selalu lolos. Untuk role lain, key dicek terhadap RPC
 * get_user_effective_permissions_v2 (lewat useEffectivePermissions).
 */
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useEffectivePermissions } from '@/hooks/useEffectivePermissions';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface PermissionRouteProps {
  children: ReactNode;
  permissionKey: string;
}

export default function PermissionRoute({ children, permissionKey }: PermissionRouteProps) {
  const { has, isLoading, isSuperAdmin } = useEffectivePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isSuperAdmin && !has(permissionKey)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-destructive mb-4">
              <AlertCircle className="h-5 w-5" />
              <p className="font-bold">Akses Ditolak</p>
            </div>
            <p className="text-muted-foreground mb-4">
              Anda tidak memiliki izin untuk mengakses halaman ini. Silakan hubungi administrator.
            </p>
            <a href="/admin" className="text-primary hover:underline">
              Kembali ke Dashboard
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}