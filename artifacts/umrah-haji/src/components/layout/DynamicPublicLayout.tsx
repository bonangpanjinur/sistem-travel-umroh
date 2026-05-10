import { ReactNode } from 'react';
import { DynamicNavbar } from './DynamicNavbar';
import { DynamicFooter } from './DynamicFooter';
import { WhatsAppWidget } from '@/components/shared/WhatsAppWidget';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AnnouncementBar } from '@/components/public/AnnouncementBar';
import { MobileBottomNav } from '@/components/pwa/MobileBottomNav';
import { PWAGatePage } from '@/components/pwa/PWAGatePage';
import { usePWAMode } from '@/hooks/usePWAMode';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';

interface DynamicPublicLayoutProps {
  children: ReactNode;
}

function PWACompactHeader() {
  const { data: settings } = useWebsiteSettings();
  const companyName = settings?.company_name || 'Vinstour';
  const tagline = settings?.tagline || 'Perjalanan Suci Anda';
  const logoUrl = settings?.logo_url;
  const themeColor = settings?.primary_color;

  return (
    <div
      className="sticky top-0 z-50 bg-primary px-4 py-2 flex items-center justify-between safe-area-top"
      style={themeColor ? { backgroundColor: themeColor } : undefined}
    >
      <div className="flex items-center gap-2">
        {logoUrl && (
          <img src={logoUrl} alt={companyName} className="h-7 w-7 rounded-lg object-contain" />
        )}
        <span className="font-bold text-sm tracking-wide text-white">{companyName}</span>
      </div>
      <span className="text-xs opacity-60 text-white truncate max-w-[140px]">{tagline}</span>
    </div>
  );
}

export function DynamicPublicLayout({ children }: DynamicPublicLayoutProps) {
  const { isStandalone } = usePWAMode();

  if (!isStandalone) {
    return (
      <ThemeProvider>
        <PWAGatePage />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col">
        <PWACompactHeader />
        <main className="flex-1">{children}</main>
        <WhatsAppWidget />
        <MobileBottomNav />
      </div>
    </ThemeProvider>
  );
}
