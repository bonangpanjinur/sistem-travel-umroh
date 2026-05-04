import { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, ShieldAlert, Crown, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AccessControlCardProps {
  title: string;
  description?: string;
  accessLevel: 'super_admin' | 'admin' | 'restricted' | 'denied';
  userRole?: string;
  reason?: string;
  children?: ReactNode;
  className?: string;
  showWarning?: boolean;
}

export function AccessControlCard({
  title,
  description,
  accessLevel,
  userRole,
  reason,
  children,
  className,
  showWarning = false,
}: AccessControlCardProps) {
  const getAccessConfig = () => {
    switch (accessLevel) {
      case 'super_admin':
        return {
          icon: Crown,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          badgeVariant: 'default' as const,
          badgeText: 'Super Admin',
          badgeClass: 'bg-amber-600',
        };
      case 'admin':
        return {
          icon: ShieldAlert,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          badgeVariant: 'secondary' as const,
          badgeText: 'Admin',
          badgeClass: 'bg-blue-600',
        };
      case 'restricted':
        return {
          icon: Lock,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          badgeVariant: 'outline' as const,
          badgeText: 'Restricted',
          badgeClass: '',
        };
      case 'denied':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          badgeVariant: 'destructive' as const,
          badgeText: 'Denied',
          badgeClass: '',
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          badgeVariant: 'secondary' as const,
          badgeText: 'Unknown',
          badgeClass: '',
        };
    }
  };

  const config = getAccessConfig();
  const Icon = config.icon;

  return (
    <Card
      className={cn(
        `border-2 ${config.borderColor} ${config.bgColor}`,
        className
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={cn('p-2 rounded-lg', config.bgColor)}>
              <Icon className={cn('h-5 w-5', config.color)} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-base">{title}</CardTitle>
                <Badge className={config.badgeClass} variant={config.badgeVariant}>
                  {config.badgeText}
                </Badge>
              </div>
              {description && (
                <CardDescription className="text-sm">{description}</CardDescription>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {userRole && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Role Pengguna:</span>
            <Badge variant="outline">{userRole}</Badge>
          </div>
        )}

        {reason && (
          <div className="flex items-start gap-2 text-sm">
            <span className="text-muted-foreground flex-shrink-0">Alasan:</span>
            <span className="text-foreground">{reason}</span>
          </div>
        )}

        {showWarning && accessLevel === 'super_admin' && (
          <div className="rounded-lg bg-amber-100/50 border border-amber-200 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800">
              <p className="font-semibold mb-1">Perhatian</p>
              <p>Hanya Super Admin yang dapat mengakses fitur ini. Gunakan dengan bijak.</p>
            </div>
          </div>
        )}

        {accessLevel === 'denied' && (
          <div className="rounded-lg bg-red-100/50 border border-red-200 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-700 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-red-800">
              <p className="font-semibold mb-1">Akses Ditolak</p>
              <p>Anda tidak memiliki izin untuk mengakses fitur ini. Hubungi Super Admin jika Anda membutuhkan akses.</p>
            </div>
          </div>
        )}

        {children}
      </CardContent>
    </Card>
  );
}
