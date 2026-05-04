import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Crown, ArrowRight } from 'lucide-react';
import { WebsiteSettings } from '@/hooks/useWebsiteSettings';

interface RoyalCTASectionProps {
  settings?: WebsiteSettings;
}

export function RoyalCTASection({ settings }: RoyalCTASectionProps) {
  const ctaTitle = settings?.cta_title || 'Siap Memulai Perjalanan Suci Anda?';
  const ctaSubtitle = settings?.cta_subtitle || 'Dapatkan penawaran eksklusif dan pendampingan personal untuk perjalanan ibadah yang tak terlupakan.';
  const ctaButtonText = settings?.cta_button_text || 'Daftar Sekarang';
  const ctaButtonLink = settings?.cta_button_link || '/register';

  return (
    <section className="py-24 bg-[#0a0a0a] relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-amber-900/40 to-amber-600/20 rounded-[3rem] p-12 md:p-20 border border-amber-500/20 shadow-[0_0_100px_rgba(217,119,6,0.1)] text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm font-bold tracking-[0.2em] uppercase mb-8">
            <Crown className="h-4 w-4" />
            Limited Availability
          </div>

          <h2 className="text-4xl md:text-6xl font-serif text-white leading-tight mb-8">
            {ctaTitle}
          </h2>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed mb-12">
            {ctaSubtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button asChild size="lg" className="bg-gradient-to-r from-amber-600 to-amber-400 hover:from-amber-500 hover:to-amber-300 text-black font-bold text-xl px-12 py-8 rounded-full shadow-[0_0_30px_rgba(217,119,6,0.3)] transition-all duration-300 hover:scale-105">
              <Link to={ctaButtonLink} className="flex items-center gap-2">
                {ctaButtonText}
                <ArrowRight className="h-6 w-6" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10 font-bold text-xl px-12 py-8 rounded-full">
              <Link to="/contact">Konsultasi VVIP</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
