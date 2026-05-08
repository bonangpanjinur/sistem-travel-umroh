import { AlertCircle, Crown, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface SuperAdminOnlyBannerProps {
  title?: string;
  description?: string;
  className?: string;
  variant?: 'warning' | 'info' | 'danger';
}

export function SuperAdminOnlyBanner({
  title = 'Fitur Super Admin',
  description = 'Hanya pengguna dengan role Super Admin yang dapat mengakses fitur ini. Akses terbatas untuk menjaga keamanan sistem.',
  className,
  variant = 'warning',
}: SuperAdminOnlyBannerProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          container: 'border-red-200 bg-red-50',
          icon: 'text-red-600',
          title: 'text-red-900',
          description: 'text-red-800',
        };
      case 'info':
        return {
          container: 'border-blue-200 bg-blue-50',
          icon: 'text-blue-600',
          title: 'text-blue-900',
          description: 'text-blue-800',
        };
      case 'warning':
      default:
        return {
          container: 'border-amber-200 bg-amber-50',
          icon: 'text-amber-600',
          title: 'text-amber-900',
          description: 'text-amber-800',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Alert className={cn(styles.container, className)}>
      <div className="flex items-start gap-3">
        <Lock className={cn('h-5 w-5 flex-shrink-0 mt-0.5', styles.icon)} />
        <div className="flex-1">
          <AlertTitle className={styles.title}>{title}</AlertTitle>
          <AlertDescription className={styles.description}>{description}</AlertDescription>
        </div>
      </div>
    </Alert>
  );
}

interface SuperAdminAccessDeniedProps {
  title?: string;
  description?: string;
  className?: string;
}

export function SuperAdminAccessDenied({
  title = 'Akses Ditolak',
  description = 'Anda tidak memiliki izin untuk mengakses halaman ini. Hanya Super Admin yang dapat mengakses fitur ini.',
  className,
}: SuperAdminAccessDeniedProps) {
  return (
    <div className={cn('flex items-center justify-center min-h-screen p-4', className)}>
      <Alert className="max-w-md border-2 border-red-200 bg-red-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <AlertTitle className="text-lg text-red-900">{title}</AlertTitle>
            <AlertDescription className="text-sm text-red-800 mt-2">
              {description}
            </AlertDescription>
          </div>
        </div>
      </Alert>
    </div>
  );
}
