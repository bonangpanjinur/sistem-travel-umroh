import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

const variantStyles: Record<StatusVariant, string> = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  default: 'bg-muted text-muted-foreground',
};

// Auto-map common statuses to variants
const statusVariantMap: Record<string, StatusVariant> = {
  confirmed: 'success', completed: 'success', paid: 'success', verified: 'success', active: 'success', won: 'success',
  pending: 'warning', partial: 'warning', waiting_payment: 'warning', new: 'warning', contacted: 'warning',
  cancelled: 'error', rejected: 'error', failed: 'error', lost: 'error', unpaid: 'error',
  qualified: 'info', proposal: 'info', negotiation: 'info', processing: 'info',
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  variant?: StatusVariant;
  className?: string;
}

export function StatusBadge({ status, label, variant, className }: StatusBadgeProps) {
  const resolvedVariant = variant || statusVariantMap[status] || 'default';
  
  return (
    <Badge
      variant="outline"
      className={cn('border-transparent font-medium', variantStyles[resolvedVariant], className)}
    >
      {label || status}
    </Badge>
  );
}
