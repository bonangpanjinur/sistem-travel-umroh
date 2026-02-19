import { ReactNode } from 'react';
import { DynamicNavbar } from './DynamicNavbar';
import { DynamicFooter } from './DynamicFooter';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { WebsiteSettings } from '@/hooks/useWebsiteSettings';

interface TenantPublicLayoutProps {
  children: ReactNode;
  settings?: WebsiteSettings | null;
}

export function TenantPublicLayout({ children, settings }: TenantPublicLayoutProps) {
  // For tenant websites, we use the main settings as fallback
  // The tenant-specific settings override branding
  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col">
        <DynamicNavbar tenantSettings={settings ?? undefined} />
        <main className="flex-1">{children}</main>
        <DynamicFooter tenantSettings={settings ?? undefined} />
      </div>
    </ThemeProvider>
  );
}
