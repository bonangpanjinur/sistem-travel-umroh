import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requireAuth = true 
}: ProtectedRouteProps) {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const location = useLocation();

  const isLoading = authLoading;

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  // If loading finished but no user, and it's required, redirect to login
  if (!isLoading && requireAuth && !user) {
    return <Navigate to={`/auth/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  // If it's an admin route (starts with /admin) and user is not admin, redirect to home
  if (location.pathname.startsWith('/admin') && !isAdmin()) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
