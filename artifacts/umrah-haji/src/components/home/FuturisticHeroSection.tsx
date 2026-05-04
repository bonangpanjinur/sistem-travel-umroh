import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, Globe, Zap } from 'lucide-react';
import { useWebsiteSettings, WebsiteSettings } from '@/hooks/useWebsiteSettings';

interface FuturisticHeroSectionProps {
  settings?: WebsiteSettings;
}

export function FuturisticHeroSection({ settings: propSettings }: FuturisticHeroSectionProps) {
  const { data: fetchedSettings } = useWebsiteSettings();
  const settings = propSettings || fetchedSettings;

  const heroTitle = settings?.hero_title || 'Masa Depan Ibadah Anda Dimulai Di Sini';
  const heroSubtitle = settings?.hero_subtitle || 'Platform umroh digital terdepan dengan teknologi manajemen jamaah real-time dan layanan premium tanpa batas.';
  const heroImageUrl = settings?.hero_image_url || 'https://images.unsplash.com/photo-1564767609342-620cb19b2357?q=80&w=2073';
  const heroCTAText = settings?.hero_cta_text || 'Eksplorasi Paket';
  const heroCTALink = settings?.hero_cta_link || '/packages';

  return (
    <section className="relative min-h-screen flex items-center bg-[#050505] overflow-hidden pt-20">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-primary text-xs font-bold tracking-widest uppercase">
              <Zap className="h-3 w-3 fill-primary text-primary" />
              Next-Gen Umrah Experience
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.1] tracking-tighter">
              {heroTitle}
            </h1>

            <p className="text-xl text-gray-400 max-w-xl leading-relaxed font-light">
              {heroSubtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-black font-bold text-lg px-10 py-7 rounded-none clip-path-polygon">
                <Link to={heroCTALink} className="flex items-center gap-2">
                  {heroCTAText}
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/10 hover:bg-white/5 text-white font-bold text-lg px-10 py-7 rounded-none bg-transparent">
                <Link to="/contact">Konsultasi Gratis</Link>
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-12 border-t border-white/5">
              {[
                { icon: Shield, label: 'Secure Payment', desc: 'Verified System' },
                { icon: Globe, label: 'Global Network', desc: 'Worldwide Access' },
                { icon: Zap, label: 'Fast Response', desc: '24/7 Support' },
              ].map((item, i) => (
                <div key={i} className="space-y-2">
                  <item.icon className="h-6 w-6 text-primary" />
                  <div className="text-sm font-bold text-white">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black aspect-square lg:aspect-[4/5]">
                <img
                  src={heroImageUrl}
                  alt="Futuristic Travel"
                  className="w-full h-full object-cover transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                
                <div className="absolute bottom-8 left-8 right-8 p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Current Status</p>
                      <p className="text-lg font-bold text-white">100% Digital Ready</p>
                    </div>
                    <div className="h-12 w-12 rounded-full border-2 border-primary flex items-center justify-center">
                      <div className="h-2 w-2 bg-primary rounded-full animate-ping" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .clip-path-polygon {
          clip-path: polygon(0 0, 100% 0, 100% 70%, 85% 100%, 0 100%);
        }
      `}} />
    </section>
  );
}
