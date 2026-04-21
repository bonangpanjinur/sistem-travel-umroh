/**
 * DashboardProtectedRoute.tsx
 * 
 * Route guard khusus untuk dashboard yang mengecek akses berdasarkan konfigurasi dinamis.
 * Mengintegrasikan role-based access dengan dynamic configuration dari super_admin.
 */

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useDashboardAccess } from '@/hooks/dashboards/useDashboardAccess';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface DashboardProtectedRouteProps {
  children: ReactNode;
  moduleKey: string;
}

export const DashboardProtectedRoute = ({ children, moduleKey }: DashboardProtectedRouteProps) => {
  const { canAccessModule, isLoading } = useDashboardAccess();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!canAccessModule(moduleKey)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle className="h-5 w-5" />
              <p className="font-bold">Akses Ditolak</p>
            </div>
            <p className="text-muted-foreground mb-4">
              Anda tidak memiliki akses ke dashboard ini. Silakan hubungi administrator untuk mendapatkan akses.
            </p>
            <a href="/admin" className="text-primary hover:underline">
              Kembali ke Dashboard Utama
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default DashboardProtectedRoute;

