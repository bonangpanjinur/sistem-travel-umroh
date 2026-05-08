import { Loader2 } from 'lucide-react';

interface OptimizedLoadingStateProps {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

/**
 * Optimized Loading State Component
 * Only shown during initial app load, not for individual page loads
 * Uses minimal CSS to avoid layout shifts
 */
export function OptimizedLoadingState({
  message = 'Memuat...',
  className = '',
  size = 'md',
  fullScreen = false,
}: OptimizedLoadingStateProps) {
  const sizeMap = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const containerClass = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-50'
    : `flex flex-col items-center justify-center gap-4 py-8 ${className}`;

  return (
    <div className={containerClass}>
      <Loader2 className={`${sizeMap[size]} animate-spin text-primary`} />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
