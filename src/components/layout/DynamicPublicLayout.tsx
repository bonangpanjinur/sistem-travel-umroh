import { ReactNode } from 'react';
import { DynamicNavbar } from './DynamicNavbar';
import { DynamicFooter } from './DynamicFooter';
import { WhatsAppWidget } from '@/components/shared/WhatsAppWidget';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

interface DynamicPublicLayoutProps {
  children: ReactNode;
}

export function DynamicPublicLayout({ children }: DynamicPublicLayoutProps) {
  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col">
        <DynamicNavbar />
        <main className="flex-1">{children}</main>
        <DynamicFooter />
        <WhatsAppWidget />
      </div>
    </ThemeProvider>
  );
}
