import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageSquare, Calendar } from 'lucide-react';
import { useWebsiteSettings, WebsiteSettings } from '@/hooks/useWebsiteSettings';

interface LuxuryCTASectionProps {
  settings?: WebsiteSettings;
}

export function LuxuryCTASection({ settings: propSettings }: LuxuryCTASectionProps) {
  const { data: fetchedSettings } = useWebsiteSettings();
  const settings = propSettings || fetchedSettings;

  const heroCTAText = settings?.hero_cta_text || 'Lihat Paket';
  const heroCTALink = settings?.hero_cta_link || '/packages';

  return (
    <section className="py-24 bg-[#1a2e25] relative overflow-hidden">
      {/* Subtle Islamic Pattern Overlay */}
      <div className="absolute inset-0 opacity-5 islamic-pattern" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-10">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-5xl font-serif text-amber-400 italic">
              Siap Memulai Perjalanan Spiritual Anda?
            </h2>
            <p className="text-amber-100/70 text-lg font-light max-w-2xl mx-auto">
              Bergabunglah dengan ribuan jamaah yang telah merasakan ketenangan ibadah bersama layanan eksklusif kami.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Button asChild size="lg" className="bg-amber-500 hover:bg-amber-600 text-[#1a2e25] font-bold px-10 py-8 rounded-none transition-transform hover:-translate-y-1 shadow-2xl">
              <Link to={heroCTALink} className="flex items-center gap-3">
                <Calendar className="h-5 w-5" />
                {heroCTAText}
              </Link>
            </Button>
            
            <Button asChild size="lg" variant="outline" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 px-10 py-8 rounded-none">
              <Link to="/contact" className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5" />
                Konsultasi WhatsApp
              </Link>
            </Button>
          </div>

          <div className="pt-10 flex items-center justify-center gap-8 text-amber-200/40">
            <div className="h-[1px] w-20 bg-gradient-to-r from-transparent to-amber-500/30" />
            <span className="text-xs uppercase tracking-[0.3em]">Layanan 24/7 Tersedia</span>
            <div className="h-[1px] w-20 bg-gradient-to-l from-transparent to-amber-500/30" />
          </div>
        </div>
      </div>
    </section>
  );
}
