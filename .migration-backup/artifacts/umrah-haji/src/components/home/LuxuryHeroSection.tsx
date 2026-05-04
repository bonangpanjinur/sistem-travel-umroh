import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Crown, ArrowRight, ShieldCheck } from 'lucide-react';
import { useWebsiteSettings, WebsiteSettings } from '@/hooks/useWebsiteSettings';

interface LuxuryHeroSectionProps {
  settings?: WebsiteSettings;
}

export function LuxuryHeroSection({ settings: propSettings }: LuxuryHeroSectionProps) {
  const { data: fetchedSettings } = useWebsiteSettings();
  const settings = propSettings || fetchedSettings;

  const heroTitle = settings?.hero_title || 'Kemurnian Ibadah dalam Kenyamanan Sempurna';
  const heroSubtitle = settings?.hero_subtitle || 'Hadirkan pengalaman spiritual yang mendalam dengan layanan VVIP yang didesain khusus untuk ketenangan ibadah Anda.';
  const heroImageUrl = settings?.hero_image_url || 'https://images.unsplash.com/photo-1564769625905-50e93615e769?q=80&w=2070';
  const heroCTAText = settings?.hero_cta_text || 'Eksplorasi Layanan VVIP';
  const heroCTALink = settings?.hero_cta_link || '/packages';

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-[#faf9f6]">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-[#f3f0e9] -skew-x-12 translate-x-1/4 z-0 hidden lg:block" />
      <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-amber-500/5 blur-3xl z-0" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-10 py-12">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full border border-amber-500/30 bg-amber-50/50 text-amber-700 text-xs font-medium uppercase tracking-widest">
                <Crown className="h-3 w-3 text-amber-600" />
                Layanan Eksklusif & Terpercaya
              </div>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif italic text-[#1a2e25] leading-[1.1] tracking-tight">
                {heroTitle}
              </h1>
              
              <div className="w-24 h-1 bg-gradient-to-r from-amber-500 to-transparent rounded-full" />
            </div>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed font-light">
              {heroSubtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-6">
              <Button asChild size="lg" className="bg-[#1a2e25] hover:bg-[#254135] text-white text-base px-10 py-7 rounded-none shadow-2xl transition-all hover:-translate-y-1">
                <Link to={heroCTALink} className="flex items-center gap-3">
                  {heroCTAText}
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="text-base px-10 py-7 rounded-none border-b border-transparent hover:border-amber-500 transition-all">
                <Link to="/contact">Konsultasi Pribadi</Link>
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-8 pt-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-600">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-tighter">Kepuasan</span>
                </div>
                <div className="text-2xl font-serif text-[#1a2e25]">99.8%</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Alumni Jamaah</div>
              </div>
              <div className="space-y-1 border-l border-amber-200 pl-8">
                <div className="text-xs font-bold text-amber-600 uppercase tracking-tighter">Hotel</div>
                <div className="text-2xl font-serif text-[#1a2e25]">Bintang 5</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Pelataran Masjid</div>
              </div>
              <div className="space-y-1 border-l border-amber-200 pl-8">
                <div className="text-xs font-bold text-amber-600 uppercase tracking-tighter">Penerbangan</div>
                <div className="text-2xl font-serif text-[#1a2e25]">Direct</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Saudi Airlines</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="relative z-10 p-4 bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] rotate-2">
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  src={heroImageUrl}
                  alt="Premium Pilgrimage Experience"
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                />
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl -z-10" />
            </div>
            
            {/* Floating Decorative Label */}
            <div className="absolute -top-6 -left-6 bg-[#1a2e25] text-amber-400 p-6 shadow-2xl z-20 hidden md:block">
              <div className="text-center space-y-1">
                <div className="text-3xl font-serif">15</div>
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold">Tahun Pengalaman</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
