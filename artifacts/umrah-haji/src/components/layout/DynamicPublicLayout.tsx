import { ReactNode } from 'react';
import { DynamicNavbar } from './DynamicNavbar';
import { DynamicFooter } from './DynamicFooter';
import { WhatsAppWidget } from '@/components/shared/WhatsAppWidget';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AnnouncementBar } from '@/components/public/AnnouncementBar';
import { MobileBottomNav } from '@/components/pwa/MobileBottomNav';
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt';
import { usePWAMode } from '@/hooks/usePWAMode';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { usePWAConfig } from '@/hooks/usePWAConfig';

interface DynamicPublicLayoutProps {
  children: ReactNode;
}

function PWACompactHeader() {
  const { data: settings } = useWebsiteSettings();
  const { iconConfig } = usePWAConfig();
  const companyName = iconConfig.appName || settings?.company_name || 'Vinstour';
  const tagline = settings?.tagline || 'Perjalanan Suci Anda';
  const logoUrl = iconConfig.iconUrl || settings?.logo_url;
  const themeColor = iconConfig.themeColor || settings?.primary_color || '#15803d';

  return (
    <div
      className="sticky top-0 z-50 px-4 py-2.5 flex items-center justify-between safe-area-top shadow-sm"
      style={{ backgroundColor: themeColor }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {logoUrl && (
          <img src={logoUrl} alt={companyName} className="h-7 w-7 rounded-lg object-contain flex-shrink-0" />
        )}
        <span className="font-bold text-sm tracking-wide text-white truncate">{companyName}</span>
      </div>
      <span className="text-xs opacity-60 text-white truncate max-w-[130px] ml-2 flex-shrink-0">{tagline}</span>
    </div>
  );
}

export function DynamicPublicLayout({ children }: DynamicPublicLayoutProps) {
  const { isStandalone } = usePWAMode();

  // ── Installed as PWA (standalone/fullscreen mode) ──
  // Compact app layout: branded header + scrollable content + bottom nav
  if (isStandalone) {
    return (
      <ThemeProvider>
        <div className="flex min-h-[100dvh] flex-col bg-background">
          <PWACompactHeader />
          <main className="flex-1 pb-safe">
            {children}
          </main>
          <WhatsAppWidget />
          <MobileBottomNav standalone />
        </div>
      </ThemeProvider>
    );
  }

  // ── Normal browser (desktop / tablet / mobile) ──
  // Full responsive website: announcement + navbar + content + footer
  // Bottom nav shows on mobile browsers too for easy navigation
  // PWAInstallPrompt appears as a subtle banner when browser supports install
  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col">
        <AnnouncementBar />
        <DynamicNavbar />
        <main className="flex-1">
          {children}
        </main>
        <DynamicFooter />
      </div>
      <WhatsAppWidget />
      <MobileBottomNav />
      <PWAInstallPrompt />
    </ThemeProvider>
  );
}
