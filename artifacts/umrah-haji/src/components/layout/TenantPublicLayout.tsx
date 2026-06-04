import { ReactNode } from 'react';
import { DynamicNavbar } from './DynamicNavbar';
import { DynamicFooter } from './DynamicFooter';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { WebsiteSettings } from '@/hooks/useWebsiteSettings';
import { AnnouncementBar } from '@/components/public/AnnouncementBar';
import { MobileBottomNav } from '@/components/pwa/MobileBottomNav';
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt';
import { WhatsAppWidget } from '@/components/shared/WhatsAppWidget';

interface TenantPublicLayoutProps {
  children: ReactNode;
  settings?: WebsiteSettings | null;
}

export function TenantPublicLayout({ children, settings }: TenantPublicLayoutProps) {
  return (
    <ThemeProvider settings={settings}>
      <div className="flex min-h-screen flex-col">
        <AnnouncementBar />
        <DynamicNavbar tenantSettings={settings ?? undefined} />
        <main className="flex-1">{children}</main>
        <DynamicFooter tenantSettings={settings ?? undefined} />
      </div>
      <WhatsAppWidget />
      <MobileBottomNav />
      <PWAInstallPrompt />
    </ThemeProvider>
  );
}
