import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Crown, Star, ShieldCheck, ArrowRight } from 'lucide-react';
import { useWebsiteSettings, WebsiteSettings } from '@/hooks/useWebsiteSettings';

interface RoyalHeroSectionProps {
  settings?: WebsiteSettings;
}

export function RoyalHeroSection({ settings: propSettings }: RoyalHeroSectionProps) {
  const { data: fetchedSettings } = useWebsiteSettings();
  const settings = propSettings || fetchedSettings;

  const heroTitle = settings?.hero_title || 'Layanan Ibadah Eksklusif & Premium';
  const heroSubtitle = settings?.hero_subtitle || 'Pengalaman spiritual tak terlupakan dengan fasilitas bintang lima dan pendampingan personal untuk kenyamanan ibadah Anda.';
  const heroImageUrl = settings?.hero_image_url || 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?q=80&w=2070';
  const heroCTAText = settings?.hero_cta_text || 'Lihat Paket Premium';
  const heroCTALink = settings?.hero_cta_link || '/packages';

  return (
    <section className="relative min-h-screen flex items-center bg-[#0a0a0a] overflow-hidden pt-20">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')]" />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-amber-900/20 via-transparent to-amber-900/20" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm font-bold tracking-[0.2em] uppercase mb-8">
            <Crown className="h-4 w-4" />
            Royal Experience
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif text-white leading-tight mb-8 max-w-5xl">
            {heroTitle}
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl leading-relaxed mb-12">
            {heroSubtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-6">
            <Button asChild size="lg" className="bg-gradient-to-r from-amber-600 to-amber-400 hover:from-amber-500 hover:to-amber-300 text-black font-bold text-lg px-12 py-8 rounded-full shadow-[0_0_30px_rgba(217,119,6,0.3)] transition-all duration-300 hover:scale-105">
              <Link to={heroCTALink} className="flex items-center gap-2">
                {heroCTAText}
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10 font-bold text-lg px-12 py-8 rounded-full">
              <Link to="/contact">Hubungi Personal Concierge</Link>
            </Button>
          </div>
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="relative rounded-[2rem] overflow-hidden border border-amber-500/20 shadow-[0_0_50px_rgba(0,0,0,0.5)] aspect-[21/9]">
            <img
              src={heroImageUrl}
              alt="Royal Travel"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
          </div>

          {/* Floating Stats */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-4 px-4">
            {[
              { icon: Star, label: 'Bintang 5', desc: 'Akomodasi Terbaik' },
              { icon: ShieldCheck, label: 'VVIP Service', desc: 'Pendampingan 24/7' },
              { icon: Crown, label: 'Eksklusif', desc: 'Grup Terbatas' },
            ].map((item, i) => (
              <div key={i} className="bg-[#1a1a1a] border border-amber-500/20 p-6 rounded-2xl flex items-center gap-4 backdrop-blur-xl">
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <item.icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-white font-bold">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
