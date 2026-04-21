/**
 * DashboardRedirect.tsx
 *
 * Komponen untuk mengarahkan pengguna ke dashboard yang sesuai berdasarkan peran mereka.
 * Digunakan sebagai landing page setelah login.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardRouter } from '@/hooks/dashboards/useDashboardRouter';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardRedirect() {
  const navigate = useNavigate();
  const { isLoading: authLoading } = useAuth();
  const { getDefaultDashboardPath } = useDashboardRouter();

  useEffect(() => {
    if (!authLoading) {
      const dashboardPath = getDefaultDashboardPath();
      navigate(dashboardPath, { replace: true });
    }
  }, [authLoading, navigate, getDefaultDashboardPath]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="space-y-4 w-full max-w-md">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-8 w-1/2" />
      </div>
    </div>
  );
}
