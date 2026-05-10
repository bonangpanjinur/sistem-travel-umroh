import { ReactNode } from 'react';
import { DynamicNavbar } from './DynamicNavbar';
import { DynamicFooter } from './DynamicFooter';
import { WhatsAppWidget } from '@/components/shared/WhatsAppWidget';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AnnouncementBar } from '@/components/public/AnnouncementBar';
import { MobileBottomNav } from '@/components/pwa/MobileBottomNav';
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt';
import { usePWAMode } from '@/hooks/usePWAMode';

interface DynamicPublicLayoutProps {
  children: ReactNode;
}

export function DynamicPublicLayout({ children }: DynamicPublicLayoutProps) {
  const { isStandalone } = usePWAMode();

  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col">
        {/* Only show announcement bar and regular navbar in browser mode */}
        {!isStandalone && <AnnouncementBar />}
        {!isStandalone && <DynamicNavbar />}

        {/* PWA standalone: show compact header */}
        {isStandalone && (
          <div className="sticky top-0 z-50 bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between safe-area-top">
            <span className="font-bold text-sm tracking-wide">Vinstour</span>
            <span className="text-xs opacity-70">Perjalanan Suci Anda</span>
          </div>
        )}

        <main className="flex-1">{children}</main>

        {/* Footer only in browser mode */}
        {!isStandalone && <DynamicFooter />}

        <WhatsAppWidget />
        <MobileBottomNav />
        {!isStandalone && <PWAInstallPrompt />}
      </div>
    </ThemeProvider>
  );
}
