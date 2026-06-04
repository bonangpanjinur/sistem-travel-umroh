import { ReactNode } from 'react';
import { DynamicNavbar } from './DynamicNavbar';
import { DynamicFooter } from './DynamicFooter';
import { MessageCircle } from 'lucide-react';

const WA_NUMBER = '6281234567890';
const WA_MESSAGE = encodeURIComponent('Halo Vinstour, saya ingin bertanya tentang paket Umroh/Haji. Mohon bantuannya 🙏');

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <DynamicNavbar />
      <main className="flex-1">{children}</main>
      <DynamicFooter />

      {/* WhatsApp Floating Button */}
      <a
        href={`https://wa.me/${WA_NUMBER}?text=${WA_MESSAGE}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#1fba5a] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 group"
        aria-label="Chat via WhatsApp"
      >
        <span className="pl-4 pr-1 py-3 hidden sm:block text-sm font-semibold whitespace-nowrap overflow-hidden max-w-0 group-hover:max-w-xs transition-all duration-300 opacity-0 group-hover:opacity-100">
          Chat WhatsApp
        </span>
        <span className="p-3.5">
          <MessageCircle className="h-6 w-6 fill-white stroke-none" />
        </span>
      </a>
    </div>
  );
}
