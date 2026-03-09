import { ReactNode } from 'react';
import { DynamicNavbar } from './DynamicNavbar';
import { DynamicFooter } from './DynamicFooter';

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <DynamicNavbar />
      <main className="flex-1">{children}</main>
      <DynamicFooter />
    </div>
  );
}
