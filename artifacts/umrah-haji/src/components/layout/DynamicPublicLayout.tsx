import { ReactNode, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
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
import { useAuth } from '@/hooks/useAuth';

const JamaahBottomNav = lazy(() =>
  import('@/components/jamaah/JamaahBottomNav').then((m) => ({ default: m.JamaahBottomNav }))
);

interface DynamicPublicLayoutProps {
  children: ReactNode;
}

function PWACompactHeader() {
  const { data: settings } = useWebsiteSettings();
  const { iconConfig } = usePWAConfig();
  const { user, hasRole } = useAuth();
  const companyName = iconConfig.appName || settings?.company_name || 'Vinstour';
  const tagline = settings?.tagline || 'Perjalanan Suci Anda';
  const logoUrl = iconConfig.iconUrl || settings?.logo_url;
  const themeColor = iconConfig.themeColor || settings?.primary_color || '#15803d';

  const homeHref = user && hasRole('jamaah') ? '/jamaah' : '/';

  return (
    <div
      className="sticky top-0 z-50 px-4 py-2.5 flex items-center justify-between safe-area-top shadow-sm"
      style={{ backgroundColor: themeColor }}
    >
      <Link to={homeHref} className="flex items-center gap-2 min-w-0 active:opacity-80 transition-opacity">
        {logoUrl && (
          <img src={logoUrl} alt={companyName} className="h-7 w-7 rounded-lg object-contain flex-shrink-0" />
        )}
        <span className="font-bold text-sm tracking-wide text-white truncate">{companyName}</span>
      </Link>
      <span className="text-xs opacity-60 text-white truncate max-w-[130px] ml-2 flex-shrink-0">{tagline}</span>
    </div>
  );
}

function BottomNavSlot({ standalone }: { standalone?: boolean }) {
  const { user, hasRole } = useAuth();

  if (user && hasRole('jamaah')) {
    return (
      <Suspense fallback={null}>
        <JamaahBottomNav noSidebar />
      </Suspense>
    );
  }

  return <MobileBottomNav standalone={standalone} />;
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
          <BottomNavSlot standalone />
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
      <BottomNavSlot />
      <PWAInstallPrompt />
    </ThemeProvider>
  );
}
